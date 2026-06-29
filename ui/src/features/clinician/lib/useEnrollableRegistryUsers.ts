import { useEffect, useState } from 'react';
import { fetchEnrollablePatients } from '@/shared/care-episode/careEpisodeApi';
import type { RegistryPatientUser } from '@/features/clinician/lib/patientRoster';

export function useEnrollableRegistryUsers(
  token: string,
  activeActor: string,
  tenantUuid: string | null | undefined,
  open: boolean,
) {
  const [users, setUsers] = useState<RegistryPatientUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tenantUuid || activeActor !== 'clinician') {
      setUsers([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await fetchEnrollablePatients(token, activeActor, tenantUuid);
        if (!cancelled) {
          setUsers(items as RegistryPatientUser[]);
        }
      } catch (err) {
        if (!cancelled) {
          setUsers([]);
          setError(err instanceof Error ? err.message : 'Failed to load enrollable patients');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, tenantUuid, open]);

  return { users, loading, error };
}
