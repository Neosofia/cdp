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
import logo from './assets/Neosofia.png';

// Auth base URL for browser navigations (login/logout redirects).
// We use a cross-origin explicit URL for both local dev and production.
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8014';
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

  const placeholderTitle = 'Dashboard';
  const pageTitle = selectedAction ?? (selectedSection || placeholderTitle);

  const handleMenuAction = (section: string, action: string, callback: () => void) => {
    setSelectedSection(section);
    setSelectedAction(action);
    callback();
  };

  const fetchSessionData = useCallback(async (retries = 2) => {
    const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014';
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
      const CAPABILITIES_API = import.meta.env.VITE_CAPABILITIES_API_URL ?? 'http://localhost:8019';
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

  const restoreLocalAuth = () => {
    const stored = localStorage.getItem(LOCAL_AUTH_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { profile: UserProfile; activeRole: string };
      if (parsed?.profile) {
        setProfile(parsed.profile);
        setActiveRole(parsed.activeRole || parsed.profile.roles?.[0] || '');
      }
    } catch {
      localStorage.removeItem(LOCAL_AUTH_KEY);
    }
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

  const handleLogout = async () => {
    // Clear the UI state immediately, then redirect browser to auth-service logout.
    setTokenInfo(null);
    setProfile(null);
    setActiveRole('');
    setSelectedSection('');
    setSelectedAction(null);
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

        restoreLocalAuth();
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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
      <header className="fixed top-0 z-50 w-full bg-slate-950/90 backdrop-blur-lg border-b border-white/10 shadow-lg">
        <div className="flex h-16 items-center px-4 md:px-6 justify-between max-w-7xl mx-auto">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <img src={logo} alt="Neosofia Logo" className="h-8 md:h-9 object-contain" />
          </div>

          <div className="flex items-center gap-3 justify-end">
            <NavigationMenu className="hidden md:flex" viewport={false}>
              <NavigationMenuList className="gap-1">
                {entitlements['ui:menu:debug'] && (<NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:text-white data-open:text-white">
                    Debug
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-65 rounded-2xl border border-white/10 bg-slate-950 text-slate-300 p-2 shadow-2xl shadow-black/40">
                    <div className="space-y-1">
                      <Button onClick={openDebugTestPage} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Test API endpoints</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>)}
                {entitlements['ui:menu:admin'] && (<NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:text-white data-open:text-white">
                    Admin
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-48 rounded-2xl border border-white/10 bg-slate-950 text-slate-300 p-2 shadow-2xl shadow-black/40">
                    <div className="space-y-1">
                      <Button onClick={() => handleMenuAction('Admin', 'Services', () => {})} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Services</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>)}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:text-white data-open:text-white">
                    Patient
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-65 rounded-2xl border border-white/10 bg-slate-950 text-slate-300 p-2 shadow-2xl shadow-black/40">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Patient actions</p>
                      <Button onClick={() => handleMenuAction('Patient', 'Start chat', () => setTestResult({ api: 'Patient: Start chat', data: 'Not implemented yet', status: 200 }))} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Start chat</Button>
                      <Button onClick={() => handleMenuAction('Patient', 'Review records', () => setTestResult({ api: 'Patient: Review records', data: 'Not implemented yet', status: 200 }))} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Review records</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:text-white data-open:text-white">
                    Clinician
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-65 rounded-2xl border border-white/10 bg-slate-950 text-slate-300 p-2 shadow-2xl shadow-black/40">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Clinician actions</p>
                      <Button onClick={() => handleMenuAction('Clinician', 'Active patients', () => setTestResult({ api: 'Clinician: Active patients', data: 'Not implemented yet', status: 200 }))} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Active patients</Button>
                      <Button onClick={() => handleMenuAction('Clinician', 'Open chat session', () => setTestResult({ api: 'Clinician: Open chat session', data: 'Not implemented yet', status: 200 }))} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Open chat</Button>
                      <Button onClick={() => handleMenuAction('Clinician', 'View patient records', () => setTestResult({ api: 'Clinician: View patient records', data: 'Not implemented yet', status: 200 }))} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">View records</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <div className="shrink-0 min-w-44">
              {profile ? (
                <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#0D4884] text-white font-semibold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex sm:flex-col sm:items-start sm:text-left gap-0.5 whitespace-nowrap">
                      <span className="text-sm font-semibold text-white leading-none">
                        {profile.first_name} {profile.last_name}
                      </span>
                      <span className="text-[11px] text-slate-400 leading-none">
                        {profile.organization_name}
                      </span>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mt-1 bg-slate-950 border border-white/10 text-slate-300 shadow-2xl shadow-black/40 rounded-2xl" align="end">
                  {/* Identity */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal flex flex-col space-y-1 p-2">
                      <span className="text-sm font-semibold leading-none text-white">{profile.first_name} {profile.last_name}</span>
                      <span className="text-xs text-slate-400 leading-none mt-0.5">{profile.email}</span>
                      <span className="text-xs text-slate-400 leading-none mt-1">Active role: <span className="text-white">{activeRole ? activeRole.replace(/-/g, ' ') : 'None'}</span></span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-white/10" />

                  {/* Organization */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Building className="h-3.5 w-3.5" />
                      <span>Organization</span>
                    </div>
                    <span className="text-xs text-slate-300 truncate max-w-30">{profile.organization_name}</span>
                  </div>

                  <DropdownMenuSeparator className="bg-white/10" />

                  {/* Role picker */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Choose active role
                    </DropdownMenuLabel>
                    <div className="space-y-1 px-1.5 pb-1">
                      {profile.roles.map(role => {
                        const selected = role === activeRole;
                        return (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => setActiveRole(role)}
                            className={`flex items-center justify-between cursor-pointer rounded-lg px-2 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 ${selected ? 'bg-white/5 text-white' : ''}`}
                          >
                            <span className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-slate-500" />
                              <span className="capitalize">{role.replace(/-/g, ' ')}</span>
                            </span>
                            {selected ? (
                              <Badge variant="outline" className="text-[10px] text-slate-400">
                                Selected
                              </Badge>
                            ) : null}
                          </DropdownMenuItem>
                        )
                      })}
                    </div>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : initializing ? (
              <div className="h-10 w-full rounded-lg bg-white/10" />
            ) : (
              <Button asChild variant="default" className="shrink-0 w-full bg-[#9B0303] hover:bg-[#7a0202] text-white border-transparent">
                <a href={`${AUTH_BASE}/login`}>Log in</a>
              </Button>
            )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pb-8 pt-20">
        <div className="mb-6">
          {Boolean(selectedSection || selectedAction) && (
            <Breadcrumb className="pt-1 pb-2 mb-2">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {selectedSection && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedSection}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
                {selectedAction && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedAction}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <h1 className="text-3xl tracking-tight font-bold mb-2 text-slate-100">{pageTitle}</h1>
        </div>

        {!tokenInfo && (
          <div className="grid gap-6">
            <Card className="col-span-2 gap-0 py-0">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Sign in to access patient records, clinical workflows, and administrative tools.</p>
              </CardContent>
            </Card>
          </div>
        )}
        {tokenInfo && (
          <div className="grid gap-6 md:grid-cols-2">
            {selectedSection === 'Admin' && selectedAction === 'Services' ? (
              <div className="col-span-2">
                <ServiceManagement token={tokenInfo.raw} activeRole={activeRole} />
              </div>
            ) : (
            <Card className="border-border shadow-sm col-span-2 gap-0 py-0">
              <CardHeader className="bg-slate-800/60 border-b border-slate-700/60 py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-slate-400" />
                  {selectedSection === 'Debug' && selectedAction === 'Test API endpoints'
                    ? 'Debug API Endpoints'
                    : 'Development Dashboard'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {selectedSection === 'Debug' ? (
                  <>
                    <div className="mb-6 rounded-lg border border-slate-700/60 bg-slate-800/60 p-4">
                      <p className="text-sm text-slate-300 font-medium mb-2">Use these buttons to verify your session, JWT, and role handling via the auth API.</p>
                    </div>

                    <div className="mb-6 grid gap-3 md:grid-cols-3">
                      <Button onClick={() => runDebugTest('Profile', `${import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014'}/api/profile`)} variant="outline" size="lg" className="w-full border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white">Profile</Button>
                      <Button onClick={() => runDebugTest('Token Inspect', `${import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014'}/api/token-inspect`)} variant="outline" size="lg" className="w-full border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white">Token Inspect</Button>
                      <Button onClick={() => runDebugTest('Documents /d1', `${import.meta.env.VITE_TEMPLATE_API_URL ?? 'http://localhost:8018'}/api/v1/documents/d1`)} variant="outline" size="lg" className="w-full border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white">Documents /d1</Button>
                    </div>
                  </>
                ) : (
                  <div className="mb-6 rounded-lg border border-slate-700/60 bg-slate-800/60 p-4">
                    <p className="text-sm text-slate-300 font-medium mb-2">Select an action from the menu to continue.</p>
                  </div>
                )}

                {testResult && (
                  <div className="rounded-lg border border-slate-700/60 overflow-hidden">
                    <div className="flex items-center px-4 py-2 border-b border-slate-700/60 bg-slate-800/60">
                      <Badge variant={testResult.status === 200 ? 'default' : 'destructive'} 
                             className={testResult.status === 200 ? 'bg-green-600 hover:bg-green-700' : ''}>
                        HTTP {testResult.status}
                      </Badge>
                      <span className="ml-3 font-mono text-sm text-slate-400">{testResult.api}</span>
                    </div>
                    <pre className="p-4 text-xs font-mono overflow-auto max-h-75 text-slate-300 bg-slate-900/60">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
