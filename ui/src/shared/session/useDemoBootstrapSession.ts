import { useState, useEffect, useRef, useCallback } from 'react';
import {
  bootstrapDemoWorkspace,
  profileHasDemoRoles,
  sessionHasDemoActor,
} from '@/shared/auth/bootstrapDemoWorkspace';
import { fetchSessionRegistryUser } from '@/shared/session/userProfileSession';
import type { TokenInfo } from '@/shared/session/types';
import type { UserProfile } from '@/shared/core/appTypes';

interface UseDemoBootstrapSessionOptions {
  tokenInfo: TokenInfo | null;
  profile: UserProfile | null;
  sessionActors: string[];
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

export function useDemoBootstrapSession({
  tokenInfo,
  profile,
  sessionActors,
  setProfile,
}: UseDemoBootstrapSessionOptions) {
  const patientContextSyncRef = useRef<string | null>(null);
  const demoBootstrapAttemptRef = useRef<string | null>(null);
  const [patientDemoSeedVersion, setPatientDemoSeedVersion] = useState(0);
  const [demoBootstrapRunning, setDemoBootstrapRunning] = useState(false);
  const [demoBootstrapError, setDemoBootstrapError] = useState<string | null>(null);
  const [demoReLoginRequired, setDemoReLoginRequired] = useState(false);

  const runDemoBootstrap = useCallback(
    async (token: string) => {
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

      const displayCode = profile.display_code?.trim() || `PAT-${userUuid.slice(-6).toUpperCase()}`;

      try {
        const result = await bootstrapDemoWorkspace({
          token,
          userUuid,
          tenantUuid,
          displayCode,
          currentRoles: profile.roles,
        });

        patientContextSyncRef.current = attemptKey;
        setPatientDemoSeedVersion((version) => version + 1);
        setDemoReLoginRequired(result.requiresReLogin);

        const registry = await fetchSessionRegistryUser(token, 'demo', userUuid);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                roles: registry.roles,
                display_code: registry.display_code ?? null,
              }
            : prev,
        );
      } catch (err) {
        demoBootstrapAttemptRef.current = null;
        setDemoBootstrapError(err instanceof Error ? err.message : 'Demo bootstrap failed');
      } finally {
        setDemoBootstrapRunning(false);
      }
    },
    [profile, sessionActors, tokenInfo, setProfile],
  );

  const resetDemoBootstrapState = useCallback(() => {
    setDemoReLoginRequired(false);
    demoBootstrapAttemptRef.current = null;
  }, []);

  useEffect(() => {
    if (!tokenInfo?.raw || Boolean(profile && !profile.tos_accepted)) {
      return;
    }
    if (!sessionHasDemoActor(sessionActors)) {
      return;
    }
    void runDemoBootstrap(tokenInfo.raw);
  }, [tokenInfo, sessionActors, profile, runDemoBootstrap]);

  return {
    patientDemoSeedVersion,
    demoBootstrapRunning,
    demoBootstrapError,
    demoReLoginRequired,
    runDemoBootstrap,
    resetDemoBootstrapState,
  };
}
