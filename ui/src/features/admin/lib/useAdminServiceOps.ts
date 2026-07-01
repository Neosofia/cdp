import { useCallback, useEffect, useState } from 'react';
import { fetchIdpOperatorOps } from '@/features/admin/lib/idpFailedAuthFeed';
import {
  fetchPlatformOperatorOps,
  mergeAuditFeedEvents,
  type DashboardAuditEvent,
} from '@/shared/platform/platformAuditFeed';
import { toUserFacingError } from '@/shared/core/userFacingError';

const AUTO_REFRESH_MS = 60_000;

export function useAdminServiceOps(token: string | undefined, activeActor: string) {
  const [rotationDueCount, setRotationDueCount] = useState<number | null>(null);
  const [auditEvents, setAuditEvents] = useState<DashboardAuditEvent[]>([]);
  const [failedSignIns24h, setFailedSignIns24h] = useState<number | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setRotationDueCount(null);
      setAuditEvents([]);
      setFailedSignIns24h(null);
      setLoading(false);
      setError('Not signed in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [platformOps, idpOps] = await Promise.all([
        fetchPlatformOperatorOps(token, activeActor),
        fetchIdpOperatorOps(token, activeActor),
      ]);
      setRotationDueCount(platformOps.rotationDueCount);
      setAuditEvents(mergeAuditFeedEvents([...platformOps.events, ...idpOps.events]));
      setFailedSignIns24h(idpOps.failedSignIns24h);
    } catch (err) {
      setError(toUserFacingError(err, 'Failed to load platform operations'));
      setRotationDueCount(null);
      setAuditEvents([]);
      setFailedSignIns24h(null);
    } finally {
      setLoading(false);
    }
  }, [token, activeActor]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { rotationDueCount, auditEvents, failedSignIns24h, loading, error, refresh };
}
