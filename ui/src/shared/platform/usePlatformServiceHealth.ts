import { useCallback, useEffect, useState } from 'react';
import {
  fetchPlatformServiceHealth,
  summarizeServiceHealth,
  type ServiceHealthRow,
} from '@/shared/platform/serviceHealth';
import { toUserFacingError } from '@/shared/core/userFacingError';

const AUTO_REFRESH_MS = 60_000;

export function usePlatformServiceHealth() {
  const [rows, setRows] = useState<ServiceHealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchPlatformServiceHealth();
      setRows(next);
      setLastRefreshAt(new Date().toISOString());
    } catch (err) {
      setError(toUserFacingError(err, 'Failed to refresh service health'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const summary = summarizeServiceHealth(rows);

  return {
    rows,
    loading,
    error,
    lastRefreshAt,
    summary,
    refresh,
  };
}
