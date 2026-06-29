import { useCallback, useEffect, useState } from 'react';
import { fetchUserRegistryTotal } from '@/shared/user-registry/userRegistryApi';

const AUTO_REFRESH_MS = 60_000;

export function useUserRegistryStats(token: string | undefined, activeActor: string) {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setTotal(null);
      setLoading(false);
      setError('Not signed in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchUserRegistryTotal(token, activeActor);
      setTotal(summary.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user count');
      setTotal(null);
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

  return { total, loading, error, refresh };
}
