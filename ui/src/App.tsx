import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import UserManagement from '@/components/UserManagement';
import { fetchRoleCatalog, roleCatalogForUi, type RoleCatalogSnapshot } from '@/lib/roleCatalogApi';
import {
  buildSessionRoleChoices,
  findSessionRoleChoice,
  resolveStoredSessionRoleChoice,
  type SessionRoleChoice,
} from '@/lib/sessionRoles';
import Dashboard from '@/components/Dashboard';
import PatientChat from '@/components/PatientChat';
import PatientRecords from '@/components/PatientRecords';
import PatientProfile from '@/components/PatientProfile';
import ClinicianActivePatients, { type EditEnrollmentInput } from '@/components/ClinicianActivePatients';
import {
  activePatientByUuid,
  DEFAULT_CLINICIAN_LIST_FILTERS,
  type ClinicianListFilters,
} from '@/lib/demoPatients';
import {
  DEFAULT_APP_ROUTE,
  pathForAppRoute,
  pushAppRoute,
  readAppRoute,
  replaceAppRoute,
  type AppRoute,
  type AppSection,
  type PatientAction,
} from '@/lib/appNavigation';
import { usePatientRegistry } from '@/lib/usePatientRegistry';
import { upsertCareEpisodeSession } from '@/lib/careEpisodeApi';
import { ensurePatientDemoContext } from '@/lib/ensurePatientDemoContext';
import { updatePatientUser } from '@/lib/userRegistryApi';
import SplashPage from '@/components/SplashPage';
import BrandBackground from '@/components/BrandBackground';
import StarField from '@/components/StarField';
import { cn } from '@/lib/utils';
import {
  AUTH_BASE,
  LOGOUT_FLAG,
  beginLogin,
  clearAuthCallbackQuery,
  hasLoggedOutLocally,
  isAuthCallbackLanding,
} from '@/lib/auth';

const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014';
const USER_API = import.meta.env.VITE_USER_API_URL ?? 'http://localhost:8018';
const CAPABILITIES_API = import.meta.env.VITE_CAPABILITIES_API_URL ?? 'http://localhost:8019';
const TEMPLATE_API = import.meta.env.VITE_TEMPLATE_API_URL ?? 'http://localhost:8900';
const IS_PROD = import.meta.env.PROD;

const LOCAL_AUTH_KEY = 'cdp-ui-auth';

// Setup OpenTelemetry right away
setupTracing();

interface LocalOauthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface UserRegistryRecord {
  uuid: string;
  tenant_uuid: string;
  display_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
}

function formatTenantLabel(name: string, displayCode?: string | null): string {
  const code = displayCode?.trim();
  return code ? `${name} (${code})` : name;
}

interface UserProfile {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  display_code: string | null;
  tenant_uuid: string;
  tenant_name: string;
  tenant_display_code?: string | null;
  /** Tier-2 organization roles from the User registry. */
  roles: string[];
  /** Tier-1 actor classes from the platform JWT. */
  actors: string[];
}

interface JwtTokenData {
  exp?: number;
  'neosofia:actors'?: string[];
  'neosofia:roles'?: string[];
  [key: string]: unknown;
}

type EntitlementsMap = Record<string, boolean>;
type EntitlementsByRole = Record<string, EntitlementsMap>;

async function fetchRoleEntitlements(
  token: string,
  role: string,
): Promise<EntitlementsMap | null> {
  const res = await fetch(`${CAPABILITIES_API}/api/v1/capabilities/ui`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': role,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`capabilities/ui failed for role ${role}: HTTP ${res.status}`, detail);
    return null;
  }
  return res.json();
}

function prefetchEntitlementsInBackground(
  token: string,
  roles: string[],
  onRoleReady: (role: string, data: EntitlementsMap) => void,
): void {
  for (const role of roles) {
    void fetchRoleEntitlements(token, role).then((data) => {
      if (data !== null) {
        onRoleReady(role, data);
      }
    });
  }
}

function jwtTier1Roles(
  profile: UserProfile | null,
  decoded: JwtTokenData,
  catalogActorClasses?: Set<string>,
): string[] {
  const raw = profile?.actors?.length ? profile.actors : decoded['neosofia:actors'] ?? [];
  const allowed =
    catalogActorClasses ??
    new Set(['operator', 'study', 'clinician', 'patient']);
  const seen = new Set<string>();
  const tier1: string[] = [];
  for (const role of raw) {
    if (allowed.has(role) && !seen.has(role)) {
      seen.add(role);
      tier1.push(role);
    }
  }
  return tier1;
}

function resolveActiveActor(actors: string[]): string {
  if (actors.length === 0) return '';

  const stored = localStorage.getItem(LOCAL_AUTH_KEY);
  if (stored) {
    try {
      const { activeActor } = JSON.parse(stored) as { activeActor?: string };
      if (activeActor && actors.includes(activeActor)) {
        return activeActor;
      }
    } catch {
      // ignore corrupt local storage
    }
  }

  return actors[0];
}

function resolveActiveOrgRole(roles: string[]): string {
  if (roles.length === 0) return '';

  const stored = localStorage.getItem(LOCAL_AUTH_KEY);
  if (stored) {
    try {
      const { activeOrgRole } = JSON.parse(stored) as { activeOrgRole?: string };
      if (activeOrgRole && roles.includes(activeOrgRole)) {
        return activeOrgRole;
      }
    } catch {
      // ignore corrupt local storage
    }
  }

  return roles[0];
}

export default function App() {
  const [tokenInfo, setTokenInfo] = useState<{ raw: string, decoded: JwtTokenData } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [testResult, setTestResult] = useState<{api: string, data: unknown, status: number} | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsMap>({});
  const [entitlementsByRole, setEntitlementsByRole] = useState<EntitlementsByRole>({});
  const [activeActor, setActiveActor] = useState<string>('');
  const [activeOrgRole, setActiveOrgRole] = useState<string>('');
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogSnapshot | null>(null);
  const initialRoute = readAppRoute();
  const [selectedSection, setSelectedSection] = useState<AppSection>(initialRoute.section);
  const [selectedAction, setSelectedAction] = useState<string | null>(initialRoute.action);
  const [clinicianPatientUuid, setClinicianPatientUuid] = useState<string | null>(initialRoute.clinicianPatientUuid);
  const [clinicianListFilters, setClinicianListFilters] = useState<ClinicianListFilters>(initialRoute.clinicianListFilters);
  const patientContextSyncRef = useRef<string | null>(null);

  const catalogActorClasses = useMemo(
    () => new Set(Object.keys(roleCatalog?.assigner_actor_prefixes ?? {})),
    [roleCatalog],
  );

  const sessionActors = useMemo(
    () =>
      tokenInfo
        ? jwtTier1Roles(
            profile,
            tokenInfo.decoded,
            catalogActorClasses.size > 0 ? catalogActorClasses : undefined,
          )
        : [],
    [profile, tokenInfo, catalogActorClasses],
  );

  const sessionRoleChoices = useMemo(
    () => buildSessionRoleChoices(sessionActors, profile?.roles ?? [], roleCatalog),
    [sessionActors, profile?.roles, roleCatalog],
  );

  const activeSessionRole = useMemo(
    () => findSessionRoleChoice(sessionRoleChoices, activeActor, activeOrgRole),
    [sessionRoleChoices, activeActor, activeOrgRole],
  );

  useEffect(() => {
    if (!tokenInfo || sessionRoleChoices.length === 0) {
      return;
    }
    if (activeActor && findSessionRoleChoice(sessionRoleChoices, activeActor, activeOrgRole)) {
      return;
    }
    const choice = resolveStoredSessionRoleChoice(sessionRoleChoices, LOCAL_AUTH_KEY);
    if (!choice) {
      return;
    }
    setActiveActor(choice.actor);
    setActiveOrgRole(choice.orgRole);
    persistSessionSelection({
      activeActor: choice.actor,
      activeOrgRole: choice.orgRole,
      activePersonaId: choice.id,
    });
  }, [tokenInfo, activeActor, activeOrgRole, sessionRoleChoices]);

  const sessionTenantUuid =
    profile?.tenant_uuid ??
    (typeof tokenInfo?.decoded?.['neosofia:tenant_uuid'] === 'string'
      ? tokenInfo.decoded['neosofia:tenant_uuid']
      : null);

  const {
    patients: registryPatients,
    registryUsers,
    loading: patientsLoading,
    error: patientsError,
    reload,
    enrollInPostCare,
  } = usePatientRegistry(
    tokenInfo?.raw,
    activeActor,
    sessionTenantUuid,
  );

  const showPatientMenu = entitlements['ui:menu:patient'];
  const showClinicianMenu = entitlements['ui:menu:clinician'];
  const showStudyUsersMenu = entitlements['ui:menu:users'];
  const isDashboard = !selectedSection && !selectedAction;

  const placeholderTitle = 'Dashboard';
  const clinicianPatient = clinicianPatientUuid
    ? activePatientByUuid(registryPatients, clinicianPatientUuid)
    : null;
  const isClinicianPatientList =
    selectedSection === 'Clinician' && selectedAction === 'Patients' && !clinicianPatientUuid;
  const pageTitle =
    clinicianPatient && selectedSection === 'Clinician'
      ? clinicianPatient.displayName
      : (selectedAction ?? (selectedSection || placeholderTitle));
  const pageSubtitle =
    clinicianPatient && selectedSection === 'Clinician'
      ? `${clinicianPatient.displayCode} · ${clinicianPatient.surgery} · Day ${clinicianPatient.daysPostOp} post-op · Session ${clinicianPatient.sessionId}`
      : null;
  const showPageHeading = !isClinicianPatientList;

  const applyRoute = useCallback((route: AppRoute, mode: 'push' | 'replace' = 'push') => {
    setSelectedSection(route.section);
    setSelectedAction(route.action);
    setClinicianPatientUuid(route.clinicianPatientUuid);
    setClinicianListFilters(route.clinicianListFilters);
    if (mode === 'replace') {
      replaceAppRoute(route);
    } else {
      pushAppRoute(route);
    }
  }, []);

  const syncRouteFromBrowser = useCallback(() => {
    const route = readAppRoute();
    setSelectedSection(route.section);
    setSelectedAction(route.action);
    setClinicianPatientUuid(route.clinicianPatientUuid);
    setClinicianListFilters(route.clinicianListFilters);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      syncRouteFromBrowser();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [syncRouteFromBrowser]);

  useEffect(() => {
    replaceAppRoute(readAppRoute());
  }, []);

  const goHome = () => {
    setTestResult(null);
    applyRoute(DEFAULT_APP_ROUTE);
  };

  const formatActionLabel = (action: string) => {
    if (action === 'Chat') return 'Chat';
    if (action === 'Profile') return 'Profile';
    return action;
  };

  const adminSectionCrumbIsLink = Boolean(selectedAction);

  const navigateClinicianPatients = (
    patientUuid: string | null = null,
    filters: ClinicianListFilters = clinicianListFilters,
  ) => {
    setTestResult(null);
    applyRoute({
      section: 'Clinician',
      action: 'Patients',
      clinicianPatientUuid: patientUuid,
      clinicianListFilters: filters,
    });
  };

  const navigatePatient = (action: PatientAction) => {
    setTestResult(null);
    applyRoute({
      section: 'Patient',
      action,
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    });
  };

  const mainNavLinkClass = (active: boolean) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-semibold tracking-wide uppercase transition-colors',
      active ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/5',
    );

  const handleMenuAction = (section: AppSection, action: string, routeOverrides?: Partial<AppRoute>) => {
    setTestResult(null);
    applyRoute({
      section,
      action,
      clinicianPatientUuid: routeOverrides?.clinicianPatientUuid ?? null,
      clinicianListFilters: routeOverrides?.clinicianListFilters ?? DEFAULT_CLINICIAN_LIST_FILTERS,
    });
  };

  const persistSessionSelection = (patch: {
    activeActor?: string;
    activeOrgRole?: string;
    activePersonaId?: string;
  }) => {
    const stored = localStorage.getItem(LOCAL_AUTH_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        profile?: UserProfile | null;
        activeActor?: string;
        activeOrgRole?: string;
        activePersonaId?: string;
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify({ ...parsed, ...patch }));
    } catch {
      // ignore corrupt local storage
    }
  };

  const ensurePatientContext = useCallback(
    async (token: string, actor: string) => {
      if (actor !== 'patient') {
        return;
      }
      const patientUuid = profile?.uuid || String(tokenInfo?.decoded?.sub ?? '');
      const tenantUuid =
        profile?.tenant_uuid ||
        (typeof tokenInfo?.decoded?.['neosofia:tenant_uuid'] === 'string'
          ? tokenInfo.decoded['neosofia:tenant_uuid']
          : '');
      if (!patientUuid || !tenantUuid) {
        return;
      }

      const syncKey = `${patientUuid}:${tenantUuid}:${actor}`;
      if (patientContextSyncRef.current === syncKey) {
        return;
      }

      const displayName =
        `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
        profile?.email ||
        'Demo Patient';
      const displayCode = profile?.display_code?.trim() || `PAT-${patientUuid.slice(-6).toUpperCase()}`;

      const actorCandidates = ['operator', 'clinician', actor].filter(
        (candidate, index, all) =>
          sessionActors.includes(candidate) && all.indexOf(candidate) === index,
      );
      if (actorCandidates.length === 0) {
        return;
      }

      const ok = await ensurePatientDemoContext(token, sessionActors, {
        patientUuid,
        tenantUuid,
        displayName,
        displayCode,
      });

      if (ok) {
        patientContextSyncRef.current = syncKey;
      }
    },
    [profile, sessionActors, tokenInfo],
  );

  const handleSessionRoleChange = (choice: SessionRoleChoice) => {
    setActiveActor(choice.actor);
    setActiveOrgRole(choice.orgRole);
    setEntitlements(entitlementsByRole[choice.actor] ?? {});
    persistSessionSelection({
      activeActor: choice.actor,
      activeOrgRole: choice.orgRole,
      activePersonaId: choice.id,
    });
    setTestResult(null);
    applyRoute(DEFAULT_APP_ROUTE, 'replace');
    if (tokenInfo?.raw) {
      void ensurePatientContext(tokenInfo.raw, choice.actor);
    }
  };

  const fetchSessionData = useCallback(async (retries = 2): Promise<string | null> => {
    if (hasLoggedOutLocally()) {
      return null;
    }

    let accessToken: string | null = null;

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

        accessToken = tokenData.access_token;
        const decoded = jwtDecode<JwtTokenData>(tokenData.access_token);
        const newTokenInfo = { raw: tokenData.access_token, decoded };
        const jwtActors = decoded?.['neosofia:actors'] || [];
        const resolvedActor = resolveActiveActor(jwtActors);

        // Clear any pending refresh timer before scheduling a new one
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

        // Publish JWT and active role immediately so profile and capabilities overlap.
        setTokenInfo(newTokenInfo);
        setActiveActor(resolvedActor);
        setActiveOrgRole('');
        setEntitlements({});
        setEntitlementsByRole({});

        const prefetchedRoles = new Set<string>();
        const cacheRoleEntitlements = (role: string, data: EntitlementsMap) => {
          setEntitlementsByRole((prev) => ({ ...prev, [role]: data }));
        };
        const startPrefetch = (rolesToLoad: string[]) => {
          const pending = rolesToLoad.filter((role) => !prefetchedRoles.has(role));
          if (pending.length === 0) {
            return;
          }
          for (const role of pending) {
            prefetchedRoles.add(role);
          }
          prefetchEntitlementsInBackground(tokenData.access_token, pending, cacheRoleEntitlements);
        };

        startPrefetch(jwtActors);

        const profileId = String(decoded.sub ?? '');
        const authHeaders = {
          Authorization: `Bearer ${tokenData.access_token}`,
          'X-Active-Actor': resolvedActor,
        };

        let registry: UserRegistryRecord | null = null;
        let tenantName = 'Unknown organization';

        if (profileId) {
          try {
            const userRes = await fetch(`${USER_API}/api/v1/users/${profileId}`, { headers: authHeaders });
            if (userRes.ok) {
              registry = (await userRes.json()) as UserRegistryRecord;
              if (registry.tenant_uuid) {
                const tenantRes = await fetch(
                  `${AUTH_API}/api/v1/tenants/${registry.tenant_uuid}`,
                  { headers: authHeaders },
                );
                if (tenantRes.ok) {
                  const tenant = (await tenantRes.json()) as {
                    name?: string;
                    display_code?: string | null;
                  };
                  if (tenant.name) {
                    tenantName = formatTenantLabel(tenant.name, tenant.display_code);
                  }
                }
              }
            }
          } catch (profileErr) {
            console.error('User profile fetch failed; keeping authenticated session', profileErr);
          }
        }

        const sessionActors = jwtTier1Roles(null, decoded);
        const orgRoles = registry?.roles ?? [];
        const newProfile: UserProfile | null = registry
          ? {
              uuid: registry.uuid,
              first_name: registry.first_name ?? '',
              last_name: registry.last_name ?? '',
              email: registry.email ?? '',
              display_code: registry.display_code,
              tenant_uuid: registry.tenant_uuid,
              tenant_name: tenantName,
              roles: orgRoles,
              actors: sessionActors,
            }
          : null;

        const remoteCatalog = await fetchRoleCatalog(tokenData.access_token, resolvedActor);
        const catalog = roleCatalogForUi(remoteCatalog);
        setRoleCatalog(catalog);

        const roleChoices = buildSessionRoleChoices(sessionActors, orgRoles, catalog);
        const storedChoice = resolveStoredSessionRoleChoice(roleChoices, LOCAL_AUTH_KEY);
        const finalActor =
          storedChoice?.actor ??
          resolveActiveActor(sessionActors.length ? sessionActors : jwtActors);
        const finalOrgRole =
          storedChoice?.orgRole ?? resolveActiveOrgRole(orgRoles);
        const finalPersonaId = storedChoice?.id;

        const actorsToPrefetch = [
          ...new Set([
            ...(sessionActors.length ? sessionActors : jwtActors),
            ...roleChoices.map((choice) => choice.actor),
          ]),
        ];
        startPrefetch(actorsToPrefetch);
        setProfile(newProfile);
        if (finalActor !== resolvedActor) {
          setEntitlements({});
        }
        setActiveActor(finalActor);
        setActiveOrgRole(finalOrgRole);
        localStorage.setItem(
          LOCAL_AUTH_KEY,
          JSON.stringify({
            profile: newProfile,
            activeActor: finalActor,
            activeOrgRole: finalOrgRole,
            activePersonaId: finalPersonaId,
          }),
        );

        return tokenData.access_token;
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

    // Only clear session when token exchange failed — not when profile/registry calls fail.
    if (!accessToken) {
      setTokenInfo(null);
      setProfile(null);
      setActiveActor('');
      setActiveOrgRole('');
      setRoleCatalog(null);
      setEntitlements({});
      setEntitlementsByRole({});
      localStorage.removeItem(LOCAL_AUTH_KEY);
    }
    return accessToken;
  }, []);

  const pingApi = async (url: string, label?: string, bearerToken?: string) => {
    const token = bearerToken ?? tokenInfo?.raw;
    if (!token) return;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Actor': activeActor,
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


  const openDebugTestPage = () => {
    setTestResult(null);
    applyRoute({
      section: 'Debug',
      action: 'Test API endpoints',
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    });
  };

  const runDebugTest = async (label: string, url: string) => {
    applyRoute({
      section: 'Debug',
      action: 'Test API endpoints',
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    });
    const token = tokenInfo?.raw ?? (await fetchSessionData());
    if (!token) return;
    pingApi(url, label, token);
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

  // Show menu when the active role's entitlements arrive; ignore other roles' prefetches.
  useEffect(() => {
    if (!activeActor) {
      return;
    }
    const cached = entitlementsByRole[activeActor];
    if (cached) {
      setEntitlements(cached);
    }
  }, [activeActor, entitlementsByRole]);

  useEffect(() => {
    if (!tokenInfo?.raw || !activeActor || entitlementsByRole[activeActor]) {
      return;
    }

    let cancelled = false;
    const loadEntitlements = async () => {
      const data = await fetchRoleEntitlements(tokenInfo.raw, activeActor);
      if (cancelled || data === null) {
        return;
      }
      setEntitlementsByRole((prev) => ({ ...prev, [activeActor]: data }));
    };

    void loadEntitlements();
    return () => {
      cancelled = true;
    };
  }, [tokenInfo, activeActor, entitlementsByRole]);

  useEffect(() => {
    if (!showPatientMenu && selectedSection === 'Patient') {
      setTestResult(null);
      applyRoute(DEFAULT_APP_ROUTE, 'replace');
    }
    if (!showClinicianMenu && selectedSection === 'Clinician') {
      setTestResult(null);
      applyRoute(DEFAULT_APP_ROUTE, 'replace');
    }
  }, [showPatientMenu, showClinicianMenu, selectedSection, applyRoute]);

  useEffect(() => {
    if (!tokenInfo?.raw || activeActor !== 'patient') {
      return;
    }
    void ensurePatientContext(tokenInfo.raw, activeActor);
  }, [activeActor, ensurePatientContext, tokenInfo]);

  const handleLogout = async () => {
    // Clear the UI state immediately, then redirect browser to auth-service logout.
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setTokenInfo(null);
    setProfile(null);
    setActiveActor('');
    setActiveOrgRole('');
    setRoleCatalog(null);
    setEntitlements({});
    setEntitlementsByRole({});
    setSelectedSection('');
    setSelectedAction(null);
    setClinicianPatientUuid(null);
    setTestResult(null);
    localStorage.removeItem(LOCAL_AUTH_KEY);
    localStorage.setItem(LOGOUT_FLAG, '1');
    sessionStorage.clear();
    window.location.href = `${AUTH_BASE}/logout`;
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const fromAuthCallback = isAuthCallbackLanding();
      if (fromAuthCallback) {
        clearAuthCallbackQuery();
      }

      // Keep LOGOUT_FLAG until beginLogin() — prevents silent re-auth on reload.
      if (fromAuthCallback || !hasLoggedOutLocally()) {
        await fetchSessionData();
      }

      if (!cancelled) {
        setInitializing(false);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [fetchSessionData]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !hasLoggedOutLocally()) {
        void fetchSessionData();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
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
      (selectedAction === 'Chat' || selectedAction === 'Review records')) ||
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
                {showStudyUsersMenu && (
                  <NavigationMenuItem>
                    <Button
                      onClick={() => handleMenuAction('Admin', 'Users')}
                      variant="ghost"
                      className={mainNavLinkClass(
                        selectedSection === 'Admin' && selectedAction === 'Users',
                      )}
                    >
                      Users
                    </Button>
                  </NavigationMenuItem>
                )}
                {entitlements['ui:menu:operator'] && (<NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-400 hover:text-cyan-300 data-open:text-cyan-300 text-sm font-semibold tracking-wide uppercase">
                    Admin
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-48 rounded-2xl p-2 shadow-2xl" style={{ background: '#05050f', border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 40px rgba(34,211,238,0.08)' }}>
                    <div className="space-y-1">
                      <Button onClick={() => handleMenuAction('Admin', 'Services')} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300">Services</Button>
                      <Button onClick={() => handleMenuAction('Admin', 'Users')} variant="ghost" className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300">Users</Button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>)}
                {showPatientMenu && (
                  <>
                    <NavigationMenuItem>
                      <Button
                        onClick={goHome}
                        variant="ghost"
                        className={mainNavLinkClass(isDashboard)}
                      >
                        Dashboard
                      </Button>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Button
                        onClick={() => navigatePatient('Chat')}
                        variant="ghost"
                        className={mainNavLinkClass(selectedSection === 'Patient' && selectedAction === 'Chat')}
                      >
                        Chat
                      </Button>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Button
                        onClick={() => navigatePatient('Profile')}
                        variant="ghost"
                        className={mainNavLinkClass(selectedSection === 'Patient' && selectedAction === 'Profile')}
                      >
                        Profile
                      </Button>
                    </NavigationMenuItem>
                  </>
                )}
                {showClinicianMenu && (
                  <>
                    <NavigationMenuItem>
                      <Button
                        onClick={goHome}
                        variant="ghost"
                        className={mainNavLinkClass(isDashboard)}
                      >
                        Dashboard
                      </Button>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Button
                        onClick={() => handleMenuAction('Clinician', 'Patients', { clinicianPatientUuid: null, clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS })}
                        variant="ghost"
                        className={mainNavLinkClass(selectedSection === 'Clinician' && selectedAction === 'Patients')}
                      >
                        Patients
                      </Button>
                    </NavigationMenuItem>
                  </>
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
                        {activeSessionRole?.label ??
                          (activeActor
                            ? activeActor.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                            : '')}
                      </span>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mt-1 text-slate-300 rounded-2xl" style={{ background: '#05050f', border: '1px solid rgba(34,211,238,0.18)', boxShadow: '0 0 60px rgba(168,85,247,0.15), 0 20px 40px rgba(0,0,0,0.6)' }} align="end">
                  {/* Identity */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal flex flex-col space-y-1 p-2">
                      <span className="text-sm font-semibold leading-none text-white">{profile.first_name} {profile.last_name}</span>
                      <span className="text-xs text-slate-400 leading-none mt-0.5">{profile.email}</span>
                      {(activeSessionRole ?? activeActor) ? (
                        <span className="text-xs text-slate-400 leading-none mt-1">
                          Role:{' '}
                          <span className="text-white">
                            {activeSessionRole?.label ??
                              activeActor.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </span>
                      ) : null}
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator style={{ background: 'rgba(34,211,238,0.12)' }} />

                  {/* Organization */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Building className="h-3.5 w-3.5" />
                      <span>Organization</span>
                    </div>
                    <span className="text-xs truncate max-w-30" style={{ color: 'rgba(34,211,238,0.8)' }}>{profile.tenant_name}</span>
                  </div>

                  <DropdownMenuSeparator style={{ background: 'rgba(34,211,238,0.12)' }} />

                  {sessionRoleChoices.length > 0 ? (
                    <>
                      <DropdownMenuGroup>
                        <DropdownMenuLabel
                          className="text-xs font-semibold uppercase tracking-widest"
                          style={{ color: 'rgba(34,211,238,0.45)' }}
                        >
                          Choose your role
                        </DropdownMenuLabel>
                        <div className="space-y-1 px-1.5 pb-1">
                          {sessionRoleChoices.map((choice) => {
                            const selected = choice.id === activeSessionRole?.id;
                            return (
                              <DropdownMenuItem
                                key={choice.id}
                                onClick={() => handleSessionRoleChange(choice)}
                                className={`flex items-center justify-between cursor-pointer rounded-lg px-2 py-2 text-sm hover:bg-cyan-500/10 hover:text-cyan-300 ${selected ? 'text-cyan-300' : 'text-slate-400'}`}
                              >
                                <span className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" style={{ color: selected ? '#22d3ee' : undefined }} />
                                  <span>{choice.label}</span>
                                </span>
                                {selected ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                    style={{ borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}
                                  >
                                    Active
                                  </Badge>
                                ) : null}
                              </DropdownMenuItem>
                            );
                          })}
                        </div>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator style={{ background: 'rgba(34,211,238,0.12)' }} />
                    </>
                  ) : null}
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
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  beginLogin();
                }}
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
          <Breadcrumb className="pt-1 pb-2 mb-2">
            <BreadcrumbList>
              {isDashboard ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={pathForAppRoute(DEFAULT_APP_ROUTE)}
                      onClick={(e) => {
                        e.preventDefault();
                        goHome();
                      }}
                      className="text-slate-500 hover:text-cyan-400"
                    >
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {selectedSection === 'Patient' && selectedAction && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{formatActionLabel(selectedAction)}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                  {selectedSection === 'Clinician' && selectedAction === 'Patients' && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {clinicianPatientUuid ? (
                          <BreadcrumbLink
                            href={pathForAppRoute({
                              section: 'Clinician',
                              action: 'Patients',
                              clinicianPatientUuid: null,
                              clinicianListFilters,
                            })}
                            onClick={(e) => {
                              e.preventDefault();
                              navigateClinicianPatients(null, clinicianListFilters);
                            }}
                            className="text-slate-500 hover:text-cyan-400"
                          >
                            Patients
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>Patients</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </>
                  )}
                  {clinicianPatient && selectedSection === 'Clinician' && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-mono">{clinicianPatient.displayCode}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                  {selectedSection === 'Admin' && selectedAction && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {adminSectionCrumbIsLink ? (
                          <BreadcrumbLink
                            href="/"
                            onClick={(e) => {
                              e.preventDefault();
                              goHome();
                            }}
                            className="text-slate-500 hover:text-cyan-400"
                          >
                            Admin
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>Admin</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{selectedAction}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                  {selectedSection === 'Debug' && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {selectedAction ? (
                          <BreadcrumbLink
                            href="/"
                            onClick={(e) => {
                              e.preventDefault();
                              openDebugTestPage();
                            }}
                            className="text-slate-500 hover:text-cyan-400"
                          >
                            Debug
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>Debug</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {selectedAction && (
                        <>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbPage>{selectedAction}</BreadcrumbPage>
                          </BreadcrumbItem>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {showPageHeading ? (
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
            >
              {pageTitle}
            </h1>
          ) : null}
          {showPageHeading && pageSubtitle ? (
            <p className="text-sm text-slate-400 mt-1 font-mono">{pageSubtitle}</p>
          ) : null}
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
                <ServiceManagement token={tokenInfo.raw} activeActor={activeActor} />
              </div>
            ) : selectedSection === 'Admin' && selectedAction === 'Users' ? (
              <div className="col-span-2">
                <UserManagement
                  token={tokenInfo.raw}
                  activeActor={activeActor}
                  activeOrgRole={activeOrgRole}
                  sessionActors={sessionActors}
                  roleCatalog={roleCatalog}
                  profileUuid={profile?.uuid}
                  onSelfRolesUpdated={() => {
                    void fetchSessionData();
                  }}
                  sessionTenantUuid={
                    profile?.tenant_uuid ??
                    (typeof tokenInfo.decoded['neosofia:tenant_uuid'] === 'string'
                      ? tokenInfo.decoded['neosofia:tenant_uuid']
                      : null)
                  }
                />
              </div>
            ) : selectedSection === 'Patient' && selectedAction === 'Chat' ? (
              <PatientChat
                token={tokenInfo.raw}
                activeActor={activeActor}
                patientName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
                patientUuid={profile?.uuid}
                careEpisodeUuid={profile?.uuid}
              />
            ) : selectedSection === 'Patient' && selectedAction === 'Profile' && profile ? (
              <div className="col-span-2">
                <PatientProfile
                  firstName={profile.first_name}
                  lastName={profile.last_name}
                  email={profile.email}
                  tenantName={profile.tenant_name}
                  displayCode={profile.display_code}
                  token={tokenInfo.raw}
                  activeActor={activeActor}
                  patientUuid={profile.uuid}
                  onViewAllRecords={() => navigatePatient('Review records')}
                />
              </div>
            ) : selectedSection === 'Patient' && selectedAction === 'Review records' ? (
              <PatientRecords token={tokenInfo.raw} activeActor={activeActor} patientUuid={profile?.uuid} />
            ) : selectedSection === 'Clinician' && selectedAction === 'Patients' ? (
              <ClinicianActivePatients
                patients={registryPatients}
                registryUsers={registryUsers}
                token={tokenInfo.raw}
                activeActor={activeActor}
                selfUuid={profile?.uuid}
                loading={patientsLoading}
                error={patientsError}
                selectedPatientUuid={clinicianPatientUuid}
                listFilters={clinicianListFilters}
                onListFiltersChange={(filters) => navigateClinicianPatients(null, filters)}
                onSelectPatient={(patientUuid) => navigateClinicianPatients(patientUuid, clinicianListFilters)}
                tenantUuid={sessionTenantUuid}
                onEnrollInPostCare={async (input) => {
                  await enrollInPostCare(input);
                }}
                onEditEnrollment={async (input: EditEnrollmentInput) => {
                  const tenantUuid = input.tenant_uuid || sessionTenantUuid;
                  if (!tenantUuid) {
                    throw new Error('Missing tenant context for patient profile update.');
                  }
                  try {
                    await updatePatientUser(tokenInfo.raw, activeActor, input.patient_uuid, {
                      display_code: input.display_code,
                      first_name: input.first_name,
                      last_name: input.last_name,
                      email: input.email,
                    });
                  } catch (err) {
                    const detail = err instanceof Error ? err.message : String(err);
                    throw new Error(`User registry: ${detail}`);
                  }
                  try {
                    await upsertCareEpisodeSession(tokenInfo.raw, activeActor, {
                      patient_uuid: input.patient_uuid,
                      tenant_uuid: tenantUuid,
                      display_code: input.display_code,
                      display_name: `${input.first_name} ${input.last_name}`.trim(),
                      surgery: input.surgery,
                      procedure_date: input.procedure_date,
                      session_id: input.session_id,
                      risk_level: input.risk_level,
                    });
                  } catch (err) {
                    const detail = err instanceof Error ? err.message : String(err);
                    throw new Error(`Care episode: ${detail}`);
                  }
                  reload();
                }}
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
                      <Button onClick={() => runDebugTest('User registry', `${USER_API}/api/v1/users/${tokenInfo?.decoded?.sub ?? ''}`)} variant="outline" size="lg" className="w-full text-cyan-300 hover:text-white" style={{ borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }}>User registry</Button>
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
                  activeActor={activeActor}
                  firstName={profile?.first_name}
                  patientToken={tokenInfo.raw}
                  patientUuid={profile?.uuid}
                  clinicianPatients={registryPatients}
                  clinicianError={patientsError}
                  onPatientGoToProfile={() => navigatePatient('Profile')}
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
