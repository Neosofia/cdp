import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  AUTH_BASE,
  LOGOUT_FLAG,
  LOCAL_AUTH_KEY,
  beginLogin,
  beginReLogin,
  consumePendingRelogin,
  clearAuthCallbackQuery,
  hasLoggedOutLocally,
  isAuthCallbackLanding,
  registerTokenRefreshHandler,
} from '@/lib/auth';
import { AUTH_API, USER_API } from '@/lib/apiBases';
import {
  formatTenantLabel,
  jwtTier1Roles,
  resolveActiveActor,
  resolveActiveOrgRole,
  type EntitlementsByRole,
  type EntitlementsMap,
  type JwtTokenData,
  type LocalOauthToken,
  type UserProfile,
  type UserRegistryRecord,
} from '@/lib/appTypes';
import { fetchRoleEntitlements, prefetchEntitlementsInBackground } from '@/lib/entitlements';
import { uiResource } from '@/lib/uiCapability';
import { fetchRoleCatalog, roleCatalogForUi, type RoleCatalogSnapshot } from '@/lib/roleCatalogApi';
import {
  buildSessionRoleChoices,
  findSessionRoleChoice,
  resolveStoredSessionRoleChoice,
  type SessionRoleChoice,
} from '@/lib/sessionRoles';
import {
  bootstrapDemoWorkspace,
  profileHasDemoRoles,
  sessionHasDemoActor,
} from '@/lib/bootstrapDemoWorkspace';
import { acceptTermsOfService } from '@/lib/userRegistryApi';
import {
  DEFAULT_APP_ROUTE,
  replaceAppRoute,
} from '@/lib/appNavigation';
import { useAppRoute } from '@/lib/useAppRoute';
import {
  TOKEN_REFRESH_INTERVAL_MS,
  accessTokenNeedsRefresh,
} from '@/lib/authSessionRefresh';

export interface UseAuthSessionOptions {
  onBeforeNavigate?: () => void;
}

export function useAuthSession(options: UseAuthSessionOptions = {}) {
  const { onBeforeNavigate } = options;
  const { route, navigate } = useAppRoute();
  const { section: selectedSection } = route;

  const [tokenInfo, setTokenInfo] = useState<{ raw: string; decoded: JwtTokenData } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsMap>({});
  const [entitlementsByRole, setEntitlementsByRole] = useState<EntitlementsByRole>({});
  const [activeActor, setActiveActor] = useState<string>('');
  const [activeOrgRole, setActiveOrgRole] = useState<string>('');
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogSnapshot | null>(null);
  const [tosAccepting, setTosAccepting] = useState(false);
  const [tosError, setTosError] = useState<string | null>(null);
  const patientContextSyncRef = useRef<string | null>(null);
  const demoBootstrapAttemptRef = useRef<string | null>(null);
  const [patientDemoSeedVersion, setPatientDemoSeedVersion] = useState(0);
  const [demoBootstrapRunning, setDemoBootstrapRunning] = useState(false);
  const [demoBootstrapError, setDemoBootstrapError] = useState<string | null>(null);
  const [demoReLoginRequired, setDemoReLoginRequired] = useState(false);

  const entitlementsReady =
    Boolean(tokenInfo && activeActor && Object.hasOwn(entitlementsByRole, activeActor));

  const catalogActorClasses = useMemo(
    () => new Set(roleCatalog?.actor_classes ?? []),
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

  const sessionTenantUuid =
    profile?.tenant_uuid ??
    (typeof tokenInfo?.decoded?.['neosofia:tenant_uuid'] === 'string'
      ? tokenInfo.decoded['neosofia:tenant_uuid']
      : null);

  const activeRoleEntitlements = entitlementsByRole[activeActor] ?? entitlements;
  const needsTosAcceptance = Boolean(profile && !profile.tos_accepted);

  const persistSessionSelection = useCallback((patch: {
    activeActor?: string;
    activeOrgRole?: string;
    activePersonaId?: string;
    profile?: UserProfile | null;
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
  }, []);

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

        const tokenRes = await fetch(`${AUTH_API}/api/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=session',
          credentials: 'include',
        });

        if (!tokenRes.ok) {
          if (tokenRes.status === 401) {
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

        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

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
          const userRes = await fetch(`${USER_API}/api/v1/users/${profileId}`, { headers: authHeaders });
          if (userRes.status === 401 || userRes.status === 403) {
            throw Object.assign(new Error('Unauthenticated'), { isAuthError: true });
          }
          if (!userRes.ok) {
            throw new Error(`User profile fetch failed: ${userRes.status}`);
          }
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
        } else {
          throw new Error('Access token missing user subject');
        }

        const fetchedSessionActors = jwtTier1Roles(null, decoded);
        const orgRoles = registry.roles ?? [];
        const newProfile: UserProfile = {
          uuid: registry.uuid,
          first_name: registry.first_name ?? '',
          last_name: registry.last_name ?? '',
          email: registry.email ?? '',
          display_code: registry.display_code,
          tenant_uuid: registry.tenant_uuid,
          tenant_name: tenantName,
          roles: orgRoles,
          actors: fetchedSessionActors,
          tos_accepted: registry.tos_accepted === true,
        };

        const remoteCatalog = await fetchRoleCatalog(tokenData.access_token, resolvedActor);
        const catalog = roleCatalogForUi(remoteCatalog);
        setRoleCatalog(catalog);

        const roleChoices = buildSessionRoleChoices(fetchedSessionActors, orgRoles, catalog);
        const storedChoice = resolveStoredSessionRoleChoice(roleChoices, LOCAL_AUTH_KEY);
        const finalActor =
          storedChoice?.actor ??
          resolveActiveActor(fetchedSessionActors.length ? fetchedSessionActors : jwtActors);
        const finalOrgRole =
          storedChoice?.orgRole ?? resolveActiveOrgRole(orgRoles);
        const finalPersonaId = storedChoice?.id;

        const actorsToPrefetch = [
          ...new Set([
            ...(fetchedSessionActors.length ? fetchedSessionActors : jwtActors),
            ...roleChoices.map((choice) => choice.actor),
          ]),
        ];
        startPrefetch(actorsToPrefetch);

        setTokenInfo(newTokenInfo);
        setProfile(newProfile);
        if (finalActor !== resolvedActor) {
          setEntitlements({});
        } else {
          setEntitlements({});
        }
        setEntitlementsByRole({});
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
          break;
        }
        if (attempt === retries) {
          console.error('Failed to fetch session data after retries', err);
        }
      }
    }

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

  const runDemoBootstrap = useCallback(async (token: string) => {
    if (!profile || !sessionHasDemoActor(sessionActors)) {
      return;
    }
    const userUuid = profile.uuid || String(tokenInfo?.decoded?.sub ?? '');
    const tenantUuid =
      profile.tenant_uuid ||
      (typeof tokenInfo?.decoded?.['neosofia:tenant_uuid'] === 'string'
        ? tokenInfo.decoded['neosofia:tenant_uuid']
        : '');
    if (!userUuid || !tenantUuid) {
      return;
    }

    const attemptKey = `${userUuid}:${tenantUuid}`;
    if (demoBootstrapAttemptRef.current === attemptKey) {
      return;
    }
    if (profileHasDemoRoles(profile.roles) && patientContextSyncRef.current === attemptKey) {
      return;
    }

    demoBootstrapAttemptRef.current = attemptKey;
    setDemoBootstrapRunning(true);
    setDemoBootstrapError(null);

    const displayName =
      `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() ||
      profile.email ||
      'Demo Patient';
    const displayCode = profile.display_code?.trim() || `PAT-${userUuid.slice(-6).toUpperCase()}`;

    try {
      const result = await bootstrapDemoWorkspace({
        token,
        userUuid,
        tenantUuid,
        displayName,
        displayCode,
        currentRoles: profile.roles,
      });

      patientContextSyncRef.current = attemptKey;
      setPatientDemoSeedVersion((version) => version + 1);
      setDemoReLoginRequired(result.requiresReLogin);

      const userRes = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Active-Actor': 'demo',
        },
      });
      if (userRes.ok) {
        const registry = (await userRes.json()) as UserRegistryRecord;
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                roles: registry.roles,
                display_code: registry.display_code,
              }
            : prev,
        );
      }
    } catch (err) {
      demoBootstrapAttemptRef.current = null;
      setDemoBootstrapError(err instanceof Error ? err.message : 'Demo bootstrap failed');
    } finally {
      setDemoBootstrapRunning(false);
    }
  }, [profile, sessionActors, tokenInfo]);

  const handleSessionRoleChange = useCallback((choice: SessionRoleChoice) => {
    setActiveActor(choice.actor);
    setActiveOrgRole(choice.orgRole);
    setEntitlements(entitlementsByRole[choice.actor] ?? {});
    persistSessionSelection({
      activeActor: choice.actor,
      activeOrgRole: choice.orgRole,
      activePersonaId: choice.id,
    });
    onBeforeNavigate?.();
    navigate(DEFAULT_APP_ROUTE, 'replace');
  }, [entitlementsByRole, navigate, onBeforeNavigate, persistSessionSelection]);

  const clearLocalSession = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setTokenInfo(null);
    setProfile(null);
    setActiveActor('');
    setActiveOrgRole('');
    setRoleCatalog(null);
    setEntitlements({});
    setEntitlementsByRole({});
    setTosAccepting(false);
    setTosError(null);
    replaceAppRoute(DEFAULT_APP_ROUTE);
    onBeforeNavigate?.();
    localStorage.removeItem(LOCAL_AUTH_KEY);
    sessionStorage.clear();
  }, [onBeforeNavigate]);

  const handleSignInAgain = useCallback(() => {
    setDemoReLoginRequired(false);
    demoBootstrapAttemptRef.current = null;
    clearLocalSession();
    beginReLogin();
  }, [clearLocalSession]);

  const handleLogout = useCallback(async () => {
    clearLocalSession();
    localStorage.setItem(LOGOUT_FLAG, '1');
    window.location.href = `${AUTH_BASE}/logout`;
  }, [clearLocalSession]);

  const handleDeclineTos = useCallback(() => {
    clearLocalSession();
    localStorage.setItem(LOGOUT_FLAG, '1');
  }, [clearLocalSession]);

  const handleAcceptTos = useCallback(async () => {
    const userId = profile?.uuid || String(tokenInfo?.decoded?.sub ?? '');
    const jwtActors = tokenInfo?.decoded?.['neosofia:actors'] ?? [];
    const actorForPatch =
      activeActor || profile?.actors?.[0] || (jwtActors.length ? jwtActors[0] : '');

    if (!tokenInfo?.raw || !userId || !actorForPatch) {
      setTosError('Session is not ready. Try signing in again.');
      return;
    }
    setTosAccepting(true);
    setTosError(null);
    try {
      const updated = await acceptTermsOfService(tokenInfo.raw, actorForPatch, userId);
      const nextProfile: UserProfile = {
        ...(profile ?? {
          uuid: userId,
          first_name: '',
          last_name: '',
          email: '',
          display_code: null,
          tenant_uuid: '',
          tenant_name: '',
          roles: [],
          actors: jwtActors,
          tos_accepted: false,
        }),
        tos_accepted: updated.tos_accepted === true,
      };
      setProfile(nextProfile);
      persistSessionSelection({ profile: nextProfile });
      replaceAppRoute(DEFAULT_APP_ROUTE);
    } catch (err) {
      setTosError(err instanceof Error ? err.message : 'Could not record acceptance');
    } finally {
      setTosAccepting(false);
    }
  }, [activeActor, persistSessionSelection, profile, tokenInfo]);

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
  }, [tokenInfo, activeActor, activeOrgRole, sessionRoleChoices, persistSessionSelection]);

  useEffect(() => {
    registerTokenRefreshHandler(() => fetchSessionData());
    return () => registerTokenRefreshHandler(null);
  }, [fetchSessionData]);

  useEffect(() => {
    if (!tokenInfo?.decoded?.exp) {
      return;
    }

    const refreshIfStale = () => {
      const exp = tokenInfo.decoded?.exp;
      if (exp && accessTokenNeedsRefresh(exp)) {
        void fetchSessionData();
      }
    };

    refreshTimerRef.current = window.setInterval(() => {
      void fetchSessionData();
    }, TOKEN_REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshIfStale();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [tokenInfo, fetchSessionData]);

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
    if (!entitlementsReady || initializing) {
      return;
    }
    const roleEntitlements = entitlementsByRole[activeActor];
    if (!roleEntitlements) {
      return;
    }
    if (!roleEntitlements[uiResource('Menu', 'patient')] && selectedSection === 'Patient') {
      onBeforeNavigate?.();
      navigate(DEFAULT_APP_ROUTE, 'replace');
    }
    if (!roleEntitlements[uiResource('Menu', 'clinician')] && selectedSection === 'Clinician') {
      onBeforeNavigate?.();
      navigate(DEFAULT_APP_ROUTE, 'replace');
    }
  }, [
    entitlementsReady,
    initializing,
    entitlementsByRole,
    activeActor,
    selectedSection,
    navigate,
    onBeforeNavigate,
  ]);

  useEffect(() => {
    if (!tokenInfo?.raw || Boolean(profile && !profile.tos_accepted)) {
      return;
    }
    if (!sessionHasDemoActor(sessionActors)) {
      return;
    }
    void runDemoBootstrap(tokenInfo.raw);
  }, [tokenInfo, sessionActors, profile, runDemoBootstrap]);

  useEffect(() => {
    if (!needsTosAcceptance) {
      return;
    }
    if (route.section || route.action) {
      replaceAppRoute(DEFAULT_APP_ROUTE);
    }
  }, [needsTosAcceptance, route.section, route.action]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const fromAuthCallback = isAuthCallbackLanding();
      if (fromAuthCallback) {
        clearAuthCallbackQuery();
      }

      if (consumePendingRelogin()) {
        beginLogin();
        return;
      }

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

  return {
    tokenInfo,
    profile,
    initializing,
    activeActor,
    activeOrgRole,
    entitlements,
    entitlementsByRole,
    roleCatalog,
    tosAccepting,
    tosError,
    patientDemoSeedVersion,
    demoBootstrapRunning,
    demoBootstrapError,
    demoReLoginRequired,
    fetchSessionData,
    clearLocalSession,
    handleLogout,
    handleSignInAgain,
    handleDeclineTos,
    handleAcceptTos,
    handleSessionRoleChange,
    persistSessionSelection,
    runDemoBootstrap,
    sessionActors,
    sessionRoleChoices,
    activeSessionRole,
    sessionTenantUuid,
    entitlementsReady,
    needsTosAcceptance,
    activeRoleEntitlements,
  };
}
