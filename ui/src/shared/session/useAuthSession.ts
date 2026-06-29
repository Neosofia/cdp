import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AUTH_BASE,
  LOGOUT_FLAG,
  beginReLogin,
} from '@/shared/auth/auth';
import { homePath } from '@/shared/app/appRoutes';
import { jwtTier1Roles } from '@/shared/core/appTypes';
import type { RoleCatalogSnapshot } from '@/shared/user-registry/roleCatalogApi';
import {
  buildSessionRoleChoices,
  findSessionRoleChoice,
  type SessionRoleChoice,
} from '@/shared/session/sessionRoles';
import {
  clearSessionAuthStorage,
  persistSessionSelection,
  writeSessionAuth,
} from '@/shared/session/localSessionStorage';
import { loadSessionSnapshot } from '@/shared/session/loadSessionSnapshot';
import type { TokenInfo } from '@/shared/session/types';
import type { UserProfile } from '@/shared/core/appTypes';
import { useDemoBootstrapSession } from '@/shared/session/useDemoBootstrapSession';
import { useSessionEntitlements } from '@/shared/session/useSessionEntitlements';
import { useSessionInitialization } from '@/shared/session/useSessionInitialization';
import { useSessionRoleSync } from '@/shared/session/useSessionRoleSync';
import { useSessionTokenRefresh } from '@/shared/session/useSessionTokenRefresh';
import { useTosSession } from '@/shared/session/useTosSession';

export interface UseAuthSessionOptions {
  onBeforeNavigate?: () => void;
}

export function useAuthSession(options: UseAuthSessionOptions = {}) {
  const { onBeforeNavigate } = options;
  const navigate = useNavigate();

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [activeActor, setActiveActor] = useState<string>('');
  const [activeOrgRole, setActiveOrgRole] = useState<string>('');
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogSnapshot | null>(null);

  const {
    entitlements,
    entitlementsByRole,
    entitlementsReady,
    activeRoleEntitlements,
    cacheRoleEntitlements,
    resetEntitlements,
    applyRoleEntitlements,
  } = useSessionEntitlements({
    tokenInfo,
    activeActor,
    initializing,
    onBeforeNavigate,
  });

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

  const clearCoreSession = useCallback(() => {
    setTokenInfo(null);
    setProfile(null);
    setActiveActor('');
    setActiveOrgRole('');
    setRoleCatalog(null);
    resetEntitlements();
    navigate(homePath(), { replace: true });
    onBeforeNavigate?.();
    clearSessionAuthStorage();
  }, [navigate, onBeforeNavigate, resetEntitlements]);

  const {
    tosAccepting,
    tosError,
    needsTosAcceptance,
    resetTosState,
    handleDeclineTos,
    handleAcceptTos,
  } = useTosSession({
    profile,
    tokenInfo,
    activeActor,
    setProfile,
    clearCoreSession,
  });

  const clearLocalSession = useCallback(() => {
    resetTosState();
    clearCoreSession();
  }, [clearCoreSession, resetTosState]);

  const fetchSessionData = useCallback(async (): Promise<string | null> => {
    const snapshot = await loadSessionSnapshot({
      onRoleEntitlementsCached: cacheRoleEntitlements,
    });

    if (!snapshot) {
      setTokenInfo(null);
      setProfile(null);
      setActiveActor('');
      setActiveOrgRole('');
      setRoleCatalog(null);
      resetEntitlements();
      clearSessionAuthStorage();
      return null;
    }

    setTokenInfo(snapshot.tokenInfo);
    setProfile(snapshot.profile);
    setRoleCatalog(snapshot.roleCatalog);
    resetEntitlements();
    setActiveActor(snapshot.activeActor);
    setActiveOrgRole(snapshot.activeOrgRole);
    writeSessionAuth({
      profile: snapshot.profile,
      activeActor: snapshot.activeActor,
      activeOrgRole: snapshot.activeOrgRole,
      activePersonaId: snapshot.activePersonaId,
    });

    return snapshot.accessToken;
  }, [cacheRoleEntitlements, resetEntitlements]);

  const { clearRefreshTimer } = useSessionTokenRefresh({
    tokenInfo,
    fetchSessionData,
  });

  useSessionInitialization({ fetchSessionData, setInitializing });

  useSessionRoleSync({
    tokenInfo,
    activeActor,
    activeOrgRole,
    sessionRoleChoices,
    setActiveActor,
    setActiveOrgRole,
  });

  const {
    patientDemoSeedVersion,
    demoBootstrapRunning,
    demoBootstrapError,
    demoReLoginRequired,
    runDemoBootstrap,
    resetDemoBootstrapState,
  } = useDemoBootstrapSession({
    tokenInfo,
    profile,
    sessionActors,
    setProfile,
  });

  const handleSessionRoleChange = useCallback(
    (choice: SessionRoleChoice) => {
      setActiveActor(choice.actor);
      setActiveOrgRole(choice.orgRole);
      applyRoleEntitlements(choice.actor);
      persistSessionSelection({
        activeActor: choice.actor,
        activeOrgRole: choice.orgRole,
        activePersonaId: choice.id,
      });
      onBeforeNavigate?.();
      navigate(homePath(), { replace: true });
    },
    [applyRoleEntitlements, navigate, onBeforeNavigate],
  );

  const handleSignInAgain = useCallback(() => {
    resetDemoBootstrapState();
    clearRefreshTimer();
    resetTosState();
    clearCoreSession();
    beginReLogin();
  }, [clearCoreSession, clearRefreshTimer, resetDemoBootstrapState, resetTosState]);

  const handleLogout = useCallback(async () => {
    clearRefreshTimer();
    clearLocalSession();
    localStorage.setItem(LOGOUT_FLAG, '1');
    window.location.href = `${AUTH_BASE}/logout`;
  }, [clearLocalSession, clearRefreshTimer]);

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
