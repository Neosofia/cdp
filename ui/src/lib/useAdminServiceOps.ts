import { useCallback, useEffect, useState } from 'react';
import { fetchAuthServices } from '@/lib/authServicesApi';
import { countFailedSignInsLast24Hours } from '@/lib/idpFailedAuthFeed';
import {
  countCredentialsDueForRotation,
  fetchOperatorAuditFeed,
  type DashboardAuditEvent,
} from '@/lib/platformAuditFeed';

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
      const [servicesRes, events, failedCount] = await Promise.all([
        fetchAuthServices(token, activeActor, 1, 100),
        fetchOperatorAuditFeed(token, activeActor),
        countFailedSignInsLast24Hours(token, activeActor),
      ]);
      setRotationDueCount(countCredentialsDueForRotation(servicesRes.items));
      setAuditEvents(events);
      setFailedSignIns24h(failedCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform operations');
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
