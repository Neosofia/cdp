import { useState, useEffect, useRef, useCallback } from 'react';
import { setupTracing } from './otel';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent } from '@/components/ui/navigation-menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { jwtDecode } from 'jwt-decode';
import { ShieldCheckIcon as Shield, ChartBarIcon as Activity, ArrowRightOnRectangleIcon as LogOut, BuildingOfficeIcon as Building } from '@heroicons/react/24/outline';
import ServiceManagement from '@/components/ServiceManagement';
import Dashboard from '@/components/Dashboard';
import PatientChat from '@/components/PatientChat';
import PatientRecords from '@/components/PatientRecords';
import ClinicianActivePatients from '@/components/ClinicianActivePatients';
import { ACTIVE_PATIENT_SESSIONS } from '@/lib/clinicianDemoData';
import SplashPage from '@/components/SplashPage';
import BrandBackground from '@/components/BrandBackground';
import StarField from '@/components/StarField';
import { cn } from '@/lib/utils';

// Auth base URL for browser navigations (login/logout redirects).
// We use a cross-origin explicit URL for both local dev and production.
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8014';
const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014';
const CAPABILITIES_API = import.meta.env.VITE_CAPABILITIES_API_URL ?? 'http://localhost:8019';
const TEMPLATE_API = import.meta.env.VITE_TEMPLATE_API_URL ?? 'http://localhost:8018';
const IS_PROD = import.meta.env.PROD;

const LOCAL_AUTH_KEY = 'cdp-ui-auth';
const LOGOUT_FLAG = 'cdp-ui-just-logged-out';

// Setup OpenTelemetry right away
setupTracing();

interface LocalOauthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  organization_name: string;
  roles: string[];
}

interface JwtTokenData {
  exp?: number;
  'neosofia:roles'?: string[];
  [key: string]: unknown;
}

let initialSessionFetch: Promise<void> | null = null;

export default function App() {
  const [tokenInfo, setTokenInfo] = useState<{ raw: string, decoded: JwtTokenData } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [testResult, setTestResult] = useState<{api: string, data: unknown, status: number} | null>(null);
  const [entitlements, setEntitlements] = useState<Record<string, boolean>>({});
  const [activeRole, setActiveRole] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [clinicianPatientId, setClinicianPatientId] = useState<string | null>(null);

  const roleKey = activeRole.toLowerCase().replace(/_/g, '-');
  const showPatientMenu = roleKey === 'patient';
  const showClinicianMenu = roleKey === 'clinician';

  const placeholderTitle = 'Dashboard';
  const clinicianPatient = clinicianPatientId
    ? ACTIVE_PATIENT_SESSIONS.find(p => p.patientId === clinicianPatientId)
    : null;
  const pageTitle =
    clinicianPatient && selectedSection === 'Clinician'
      ? `Patients — ${clinicianPatient.displayName}`
      : (selectedAction ?? (selectedSection || placeholderTitle));
  const pageSubtitle =
    clinicianPatient && selectedSection === 'Clinician'
      ? `${clinicianPatient.patientId} · ${clinicianPatient.surgery} · Day ${clinicianPatient.daysPostOp} post-op · Session ${clinicianPatient.sessionId}`
      : null;

  const goHome = () => {
    setSelectedSection('');
    setSelectedAction(null);
    setClinicianPatientId(null);
    setTestResult(null);
  };

  /** Section crumb → role dashboard (home). */
  const navigateSectionDashboard = () => {
    goHome();
  };

  /** Action crumb → list/main view for that section (e.g. patient list, services). */
  const navigateActionHome = () => {
    if (selectedSection === 'Clinician' && selectedAction === 'Patients') {
      navigateClinicianPatients(null);
      return;
    }
    if (selectedSection === 'Admin' && selectedAction === 'Services') {
      setSelectedSection('Admin');
      setSelectedAction('Services');
      setClinicianPatientId(null);
      setTestResult(null);
      return;
    }
    if (selectedSection === 'Debug') {
      openDebugTestPage();
      return;
    }
    goHome();
  };

  const sectionCrumbIsLink = Boolean(selectedAction || clinicianPatientId);
  const actionCrumbIsLink = Boolean(clinicianPatientId && selectedSection === 'Clinician');

  const navigateClinicianPatients = (patientId: string | null = null) => {
    setSelectedSection('Clinician');
    setSelectedAction('Patients');
    setClinicianPatientId(patientId);
    setTestResult(null);
  };

  const navigatePatient = (action: 'Start chat' | 'Review records') => {
    setSelectedSection('Patient');
    setSelectedAction(action);
    setClinicianPatientId(null);
    setTestResult(null);
  };

  const handleMenuAction = (section: string, action: string, callback: () => void) => {
    setSelectedSection(section);
    setSelectedAction(action);
    if (section !== 'Clinician') setClinicianPatientId(null);
    callback();
  };

  const fetchSessionData = useCallback(async (retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        // Step 1: exchange session cookie for platform JWT
        const tokenRes = await fetch(`${AUTH_API}/api/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=session',
          credentials: 'include'
        });

        if (!tokenRes.ok) {
          if (tokenRes.status === 401) {
            // Unauthenticated (no session cookie) — do not retry, just fail fast
            throw Object.assign(new Error('Unauthenticated'), { isAuthError: true });
          }
          throw new Error(`Token fetch failed: ${tokenRes.status}`);
        }

        const tokenData: LocalOauthToken = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('No access token in response');

        const decoded = jwtDecode<JwtTokenData>(tokenData.access_token);
        const newTokenInfo = { raw: tokenData.access_token, decoded };
        const roles = decoded?.['neosofia:roles'] || [];
        const newRole = roles.length > 0 ? roles[0] : '';

        // Step 2: use the verified JWT to fetch profile — no session unseal on the server
        const profileRes = await fetch(`${AUTH_API}/api/profile`, {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
        });

        const newProfile = profileRes.ok ? await profileRes.json() : null;

        // Clear any pending refresh timer before scheduling a new one
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

        // Token expiration is managed by a useEffect instead

        // Single batch update — no intermediate render states
        setTokenInfo(newTokenInfo);
        setProfile(newProfile);
        setActiveRole(newRole);
        localStorage.setItem(
          LOCAL_AUTH_KEY,
          JSON.stringify({ profile: newProfile, activeRole: newRole })
        );
        return;
      } catch (err) {
        if (err && typeof err === 'object' && 'isAuthError' in err) {
          // Break cleanly without retrying if it's a known auth failure
          break;
        }
        if (attempt === retries) {
          console.error('Failed to fetch session data after retries', err);
        }
      }
    }

    // All retries failed — session is gone; show login button
    setTokenInfo(null);
    setProfile(null);
    setActiveRole('');
    localStorage.removeItem(LOCAL_AUTH_KEY);
  }, []);

  const pingApi = async (url: string, label?: string) => {
    if (!tokenInfo) return;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tokenInfo.raw}`,
          'X-Active-Role': activeRole,
        }
      });
      if (res.status === 401) {
        // Token may be expired — attempt silent refresh; UI will update on its own
        fetchSessionData();
      }
      const data = await res.json();
      setTestResult({ api: label ?? url, data, status: res.status });
    } catch (e: unknown) {
      setTestResult({ api: label ?? url, data: e instanceof Error ? e.message : 'Unknown error', status: 500 });
    }
  };


  // Fetch entitlements whenever the token or active role changes
  useEffect(() => {
    const fetchEntitlements = async () => {
      if (!tokenInfo?.raw) {
        setEntitlements({});
        return;
      }
      try {
        const res = await fetch(`${CAPABILITIES_API}/api/v1/capabilities`, {
          headers: {
            'Authorization': `Bearer ${tokenInfo.raw}`,
            'X-Active-Role': activeRole,
          }
        });
        if (res.ok) {
          const data = await res.json();
          setEntitlements(data);
        } else {
          setEntitlements({});
        }
      } catch (e) {
        console.error("Failed to fetch entitlements", e);
      }
    };
    fetchEntitlements();
  }, [tokenInfo, activeRole]);

  const openDebugTestPage = () => {
    setSelectedSection('Debug');
    setSelectedAction('Test API endpoints');
    setTestResult(null);
  };

  const runDebugTest = async (label: string, url: string) => {
    setSelectedSection('Debug');
    setSelectedAction('Test API endpoints');
    if (!tokenInfo) {
      await fetchSessionData();
    }
    pingApi(url, label);
  };

  useEffect(() => {
    if (tokenInfo?.decoded?.exp) {
      const expirationTime = tokenInfo.decoded.exp * 1000;
      const refreshIn = Math.max(expirationTime - Date.now() - 60_000, 0);
      refreshTimerRef.current = setTimeout(() => {
        fetchSessionData();
      }, refreshIn);
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [tokenInfo, fetchSessionData]);

  useEffect(() => {
    if (showPatientMenu && selectedSection === 'Clinician') {
      setSelectedSection('');
      setSelectedAction(null);
      setClinicianPatientId(null);
    }
    if (showClinicianMenu && selectedSection === 'Patient') {
      setSelectedSection('');
      setSelectedAction(null);
    }
  }, [showPatientMenu, showClinicianMenu, selectedSection]);

  const handleLogout = async () => {
    // Clear the UI state immediately, then redirect browser to auth-service logout.
    setTokenInfo(null);
    setProfile(null);
    setActiveRole('');
    setSelectedSection('');
    setSelectedAction(null);
    setClinicianPatientId(null);
    setTestResult(null);
    localStorage.removeItem(LOCAL_AUTH_KEY);
    localStorage.setItem(LOGOUT_FLAG, '1');
    window.location.href = `${AUTH_BASE}/logout`;
  };

  useEffect(() => {
    const initialize = async () => {
      if (initialSessionFetch) {
        await initialSessionFetch;
        setInitializing(false);
        return;
      }

      initialSessionFetch = (async () => {
        const justLoggedOut = localStorage.getItem(LOGOUT_FLAG);
        if (justLoggedOut) {
          localStorage.removeItem(LOGOUT_FLAG);
          return;
        }

        await fetchSessionData();
      })();

      try {
        await initialSessionFetch;
      } catch (error) {
        initialSessionFetch = null;
        throw error;
      } finally {
        setInitializing(false);
      }
    };

    initialize();
  }, [fetchSessionData]);

  const initials = `${profile?.first_name?.charAt(0) || ''}${profile?.last_name?.charAt(0) || ''}`.toUpperCase();

  if (!tokenInfo) {
    if (initializing) {
      return <BrandBackground />;
    }
    return <SplashPage />;
  }

  const fillViewport =
    (selectedSection === 'Patient' &&
      (selectedAction === 'Start chat' || selectedAction === 'Review records')) ||
    (selectedSection === 'Clinician' && selectedAction === 'Patients');

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans relative" style={{ background: '#05050f' }}>
      {/* Persistent star background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <StarField />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.05) 50%, transparent 80%)' }}
        />
      </div>

      <header
        className="fixed top-0 z-50 w-full backdrop-blur-lg"
        style={{ background: 'rgba(5,5,15,0.92)', borderBottom: '1px solid rgba(34,211,238,0.12)' }}
      >
        <div className="flex h-16 items-center px-4 md:px-6 justify-between max-w-7xl mx-auto">
          {/* SPAWN 2 Branding */}
          <div className="flex items-center gap-3">
            <span
              className="text-xl font-black tracking-wider uppercase"
              style={{
                fontFamily: "'Orbitron', monospace",
                background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              SPAWN
            </span>
            <span className="text-sm font-semibold text-slate-400 tracking-widest uppercase border border-slate-600 rounded px-1.5 py-0.5">
              2
            </span>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <NavigationMenu className="hidden md:flex" viewport={false}>
              <NavigationMenuList className="gap-1">
                {entitlements['ui:menu:debug'] && (<NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-400 hover:text-cyan-300 data-open:text-cyan-300 text-sm font-semibold tracking-wide uppercase">
                    Debug
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-65 rounded-2xl p-2 shadow-2xl" style={{ background: '#05050f', border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 40px rgba(34,211,238,0.08)' }}>
                    <div className="space-y-1">
                      <Button onClick={openDebugTestPage} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300">Test API endpoints</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>)}
                {entitlements['ui:menu:admin'] && (<NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-400 hover:text-cyan-300 data-open:text-cyan-300 text-sm font-semibold tracking-wide uppercase">
                    Admin
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-48 rounded-2xl p-2 shadow-2xl" style={{ background: '#05050f', border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 40px rgba(34,211,238,0.08)' }}>
                    <div className="space-y-1">
                      <Button onClick={() => handleMenuAction('Admin', 'Services', () => {})} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300">Services</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>)}
                {showPatientMenu && (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-400 hover:text-cyan-300 data-open:text-cyan-300 text-sm font-semibold tracking-wide uppercase">
                    Patient
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-65 rounded-2xl p-2 shadow-2xl" style={{ background: '#05050f', border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 40px rgba(34,211,238,0.08)' }}>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-widest px-3 py-2" style={{ color: 'rgba(34,211,238,0.5)' }}>Patient actions</p>
                      <Button onClick={() => handleMenuAction('Patient', 'Start chat', () => setTestResult(null))} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300">Start chat</Button>
                      <Button onClick={() => handleMenuAction('Patient', 'Review records', () => setTestResult(null))} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300">Review records</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                )}
                {showClinicianMenu && (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-400 hover:text-cyan-300 data-open:text-cyan-300 text-sm font-semibold tracking-wide uppercase">
                    Clinician
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-65 rounded-2xl p-2 shadow-2xl" style={{ background: '#05050f', border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 40px rgba(34,211,238,0.08)' }}>
                    <div className="space-y-1">
                      <Button onClick={() => handleMenuAction('Clinician', 'Patients', () => { setTestResult(null); setClinicianPatientId(null); })} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300">Patients</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>

            <div className="shrink-0 min-w-44">
              {profile ? (
                <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-cyan-500/5 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className="text-white font-bold text-xs"
                        style={{ background: 'linear-gradient(135deg, #22d3ee, #a855f7)' }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex sm:flex-col sm:items-start sm:text-left gap-0.5 whitespace-nowrap">
                      <span className="text-sm font-semibold text-white leading-none">
                        {profile.first_name} {profile.last_name}
                      </span>
                      <span className="text-[11px] leading-none" style={{ color: 'rgba(34,211,238,0.6)' }}>
                        {profile.organization_name}
                      </span>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mt-1 text-slate-300 rounded-2xl" style={{ background: '#05050f', border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 60px rgba(168,85,247,0.15), 0 20px 40px rgba(0,0,0,0.6)' }} align="end">
                  {/* Identity */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal flex flex-col space-y-1 p-2">
                      <span className="text-sm font-semibold leading-none text-white">{profile.first_name} {profile.last_name}</span>
                      <span className="text-xs text-slate-400 leading-none mt-0.5">{profile.email}</span>
                      <span className="text-xs text-slate-400 leading-none mt-1">Active role: <span className="text-white">{activeRole ? activeRole.replace(/-/g, ' ') : 'None'}</span></span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator style={{ background: 'rgba(34,211,238,0.12)' }} />

                  {/* Organization */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Building className="h-3.5 w-3.5" />
                      <span>Organization</span>
                    </div>
                    <span className="text-xs truncate max-w-30" style={{ color: 'rgba(34,211,238,0.8)' }}>{profile.organization_name}</span>
                  </div>

                  <DropdownMenuSeparator style={{ background: 'rgba(34,211,238,0.12)' }} />

                  {/* Role picker */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(34,211,238,0.45)' }}>
                      Choose active role
                    </DropdownMenuLabel>
                    <div className="space-y-1 px-1.5 pb-1">
                      {profile.roles.map(role => {
                        const selected = role === activeRole;
                        return (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => setActiveRole(role)}
                            className={`flex items-center justify-between cursor-pointer rounded-lg px-2 py-2 text-sm hover:bg-cyan-500/10 hover:text-cyan-300 ${selected ? 'text-cyan-300' : 'text-slate-400'}`}
                          >
                            <span className="flex items-center gap-2">
                              <Shield className="h-4 w-4" style={{ color: selected ? '#22d3ee' : undefined }} />
                              <span className="capitalize">{role.replace(/-/g, ' ')}</span>
                            </span>
                            {selected ? (
                              <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}>
                                Active
                              </Badge>
                            ) : null}
                          </DropdownMenuItem>
                        )
                      })}
                    </div>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator style={{ background: 'rgba(34,211,238,0.12)' }} />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : initializing ? (
              <div className="h-10 w-full rounded-lg" style={{ background: 'rgba(34,211,238,0.08)' }} />
            ) : (
              <a
                href={`${AUTH_BASE}/login`}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)', boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}
              >
                ⚡ Login
              </a>
            )}
            </div>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'relative z-10 flex-1 min-h-0 flex flex-col max-w-7xl mx-auto w-full px-4 md:px-8 pt-20',
          fillViewport ? 'overflow-hidden pb-4' : 'overflow-y-auto pb-8',
        )}
      >
        <div className={cn('shrink-0', fillViewport ? 'mb-4' : 'mb-6')}>
          {Boolean(selectedSection || selectedAction) && (
            <Breadcrumb className="pt-1 pb-2 mb-2">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" onClick={e => { e.preventDefault(); goHome(); }} className="text-slate-500 hover:text-cyan-400">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {selectedSection && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {sectionCrumbIsLink ? (
                        <BreadcrumbLink
                          href="/"
                          onClick={(e) => {
                            e.preventDefault();
                            navigateSectionDashboard();
                          }}
                          className="text-slate-500 hover:text-cyan-400"
                        >
                          {selectedSection}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{selectedSection}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </>
                )}
                {selectedAction && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {actionCrumbIsLink ? (
                        <BreadcrumbLink
                          href="/"
                          onClick={(e) => {
                            e.preventDefault();
                            navigateActionHome();
                          }}
                          className="text-slate-500 hover:text-cyan-400"
                        >
                          {selectedAction}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{selectedAction}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </>
                )}
                {clinicianPatientId && selectedSection === 'Clinician' && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-mono">{clinicianPatientId}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <h1
            className="text-3xl font-black uppercase tracking-wide mb-2"
            style={{
              fontFamily: "'Orbitron', monospace",
              background: 'linear-gradient(135deg, #22d3ee 10%, #818cf8 55%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(34,211,238,0.3))',
            }}
          >{pageTitle}</h1>
          {pageSubtitle && (
            <p className="text-sm text-slate-400 mt-1 font-mono">{pageSubtitle}</p>
          )}
        </div>

        {tokenInfo && (
          <div
            className={cn(
              fillViewport
                ? 'flex-1 min-h-0 overflow-hidden flex flex-col'
                : 'grid gap-6 md:grid-cols-2',
            )}
          >
            {selectedSection === 'Admin' && selectedAction === 'Services' ? (
              <div className="col-span-2">
                <ServiceManagement token={tokenInfo.raw} activeRole={activeRole} />
              </div>
            ) : selectedSection === 'Patient' && selectedAction === 'Start chat' ? (
              <PatientChat
                token={tokenInfo.raw}
                activeRole={activeRole}
                patientName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
              />
            ) : selectedSection === 'Patient' && selectedAction === 'Review records' ? (
              <PatientRecords />
            ) : selectedSection === 'Clinician' && selectedAction === 'Patients' ? (
              <ClinicianActivePatients
                selectedPatientId={clinicianPatientId}
                onSelectPatient={setClinicianPatientId}
              />
            ) : selectedSection === 'Debug' ? (
              <div className="col-span-2">
                <Card
                  className="gap-0 py-0"
                  style={{ background: 'rgba(5,5,15,0.7)', border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 40px rgba(34,211,238,0.05)' }}
                >
                  <CardHeader
                    className="py-4"
                    style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}
                  >
                    <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#22d3ee' }}>
                      <Activity className="h-5 w-5" style={{ color: '#22d3ee' }} />
                      Debug API Endpoints
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="mb-6 rounded-lg p-4" style={{ border: '1px solid rgba(34,211,238,0.15)', background: 'rgba(34,211,238,0.04)' }}>
                      <p className="text-sm font-medium" style={{ color: 'rgba(34,211,238,0.8)' }}>Use these buttons to verify your session, JWT, and role handling via the auth API.</p>
                    </div>
                    <div className="mb-6 grid gap-3 md:grid-cols-3">
                      <Button onClick={() => runDebugTest('Profile', `${AUTH_API}/api/profile`)} variant="outline" size="lg" className="w-full text-cyan-300 hover:text-white" style={{ borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }}>Profile</Button>
                      {!IS_PROD && (
                        <Button onClick={() => runDebugTest('Token Inspect', `${AUTH_API}/api/token-inspect`)} variant="outline" size="lg" className="w-full text-cyan-300 hover:text-white" style={{ borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }}>Token Inspect</Button>
                      )}
                      <Button onClick={() => runDebugTest('Documents /d1', `${TEMPLATE_API}/api/v1/documents/d1`)} variant="outline" size="lg" className="w-full text-cyan-300 hover:text-white" style={{ borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }}>Documents /d1</Button>
                    </div>
                    {testResult && (
                      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(34,211,238,0.18)' }}>
                        <div className="flex items-center px-4 py-2" style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.05)' }}>
                          <Badge variant={testResult.status === 200 ? 'default' : 'destructive'}
                                 className={testResult.status === 200 ? 'bg-green-600 hover:bg-green-700' : ''}>
                            HTTP {testResult.status}
                          </Badge>
                          <span className="ml-3 font-mono text-sm" style={{ color: 'rgba(34,211,238,0.6)' }}>{testResult.api}</span>
                        </div>
                        <pre className="p-4 text-xs font-mono overflow-auto max-h-75 text-slate-300" style={{ background: 'rgba(5,5,15,0.8)' }}>
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="col-span-2">
                <Dashboard
                  activeRole={activeRole}
                  firstName={profile?.first_name}
                  onPatientStartChat={() => navigatePatient('Start chat')}
                  onPatientReviewRecords={() => navigatePatient('Review records')}
                  onClinicianOpenPatients={navigateClinicianPatients}
                />
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
