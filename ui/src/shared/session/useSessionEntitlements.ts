import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { EntitlementsByRole, EntitlementsMap } from '@/shared/core/appTypes';
import { toUserFacingError } from '@/shared/core/userFacingError';
import { fetchRoleEntitlements } from '@/shared/session/entitlements';
import { homePath, isClinicianPatientsPath, isPatientPath } from '@/shared/app/appRoutes';
import { uiResource } from '@/shared/core/uiCapability';
import type { TokenInfo } from '@/shared/session/types';

interface UseSessionEntitlementsOptions {
  tokenInfo: TokenInfo | null;
  activeActor: string;
  initializing: boolean;
  onBeforeNavigate?: () => void;
}

export function useSessionEntitlements({
  tokenInfo,
  activeActor,
  initializing,
  onBeforeNavigate,
}: UseSessionEntitlementsOptions) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [entitlements, setEntitlements] = useState<EntitlementsMap>({});
  const [entitlementsByRole, setEntitlementsByRole] = useState<EntitlementsByRole>({});
  const [entitlementsError, setEntitlementsError] = useState<string | null>(null);

  const entitlementsReady =
    Boolean(tokenInfo && activeActor && Object.hasOwn(entitlementsByRole, activeActor));

  const activeRoleEntitlements = entitlementsByRole[activeActor] ?? entitlements;

  const cacheRoleEntitlements = useCallback((role: string, data: EntitlementsMap) => {
    setEntitlementsByRole((prev) => ({ ...prev, [role]: data }));
  }, []);

  const resetEntitlements = useCallback(() => {
    setEntitlements({});
    setEntitlementsByRole({});
    setEntitlementsError(null);
  }, []);

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
      setEntitlementsError(null);
      try {
        const data = await fetchRoleEntitlements(tokenInfo.raw, activeActor);
        if (cancelled) {
          return;
        }
        setEntitlementsByRole((prev) => ({ ...prev, [activeActor]: data }));
      } catch (error) {
        if (cancelled) {
          return;
        }
        setEntitlementsByRole((prev) => ({ ...prev, [activeActor]: {} }));
        setEntitlementsError(toUserFacingError(error, 'Failed to load access permissions'));
      }
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
    if (!roleEntitlements[uiResource('Menu', 'patient')] && isPatientPath(pathname)) {
      onBeforeNavigate?.();
      navigate(homePath(), { replace: true });
    }
    if (!roleEntitlements[uiResource('Menu', 'clinician')] && isClinicianPatientsPath(pathname)) {
      onBeforeNavigate?.();
      navigate(homePath(), { replace: true });
    }
  }, [
    entitlementsReady,
    initializing,
    entitlementsByRole,
    activeActor,
    pathname,
    navigate,
    onBeforeNavigate,
  ]);

  const applyRoleEntitlements = useCallback(
    (actor: string) => {
      setEntitlements(entitlementsByRole[actor] ?? {});
    },
    [entitlementsByRole],
  );

  return {
    entitlements,
    entitlementsByRole,
    entitlementsReady,
    entitlementsError,
    activeRoleEntitlements,
    cacheRoleEntitlements,
    resetEntitlements,
    applyRoleEntitlements,
  };
}
