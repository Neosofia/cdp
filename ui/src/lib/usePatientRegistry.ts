import { useCallback, useEffect, useState } from 'react';
import {
  displayNameForUser,
  mergePatientRecoveries,
  riskLevelFromApi,
  sortPatientRecoveriesByRiskAndRecency,
  type ActivePatientRecovery,
  type RegistryPatientUser,
} from '@/lib/demoPatients';
import {
  enrollPatientInPostCare,
  type PostCareEnrollmentInput,
  type PostCareEnrollmentResult,
} from '@/lib/postCareEnrollment';
import { listCareEpisodeRecoveries, type CareEpisodeRecovery } from '@/lib/careEpisodeApi';
import { fetchLastChatActivityByPatient } from '@/lib/chatApi';
import { tenantUsersListPath } from '@/lib/userRegistryApi';

const PATIENT_PAGE_SIZE = 100;
const PATIENT_SELF_ROLE = 'patient.self';
const REGISTRY_FETCH_RETRIES = 3;
const REGISTRY_FETCH_RETRY_MS = 400;

function isTransientFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message === 'failed to fetch' || message.includes('network');
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = REGISTRY_FETCH_RETRIES,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (!isTransientFetchError(error) || attempt === retries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, REGISTRY_FETCH_RETRY_MS * (attempt + 1)));
    }
  }
  throw lastError;
}

interface UserListResponse {
  items: RegistryPatientUser[];
  total: number;
}

export interface PatientRegistryState {
  patients: ActivePatientRecovery[];
  registryUsers: RegistryPatientUser[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  enrollInPostCare: (input: PostCareEnrollmentInput) => Promise<PostCareEnrollmentResult>;
}

function isRegistryPatient(user: RegistryPatientUser): boolean {
  return user.roles.includes(PATIENT_SELF_ROLE);
}

function recoveryFromCareEpisode(
  care: CareEpisodeRecovery,
  user?: RegistryPatientUser,
): ActivePatientRecovery {
  return {
    patientUuid: care.user_uuid,
    displayCode: care.display_code,
    displayName: user ? displayNameForUser(user) : care.display_name,
    surgery: care.surgery,
    procedureDate: care.procedure_date,
    daysPostOp: care.days_post_op,
    recoveryId: care.recovery_id,
    lastChatAt: null,
    riskLevel: riskLevelFromApi(care.risk_level),
    riskSummary: care.risk_summary ?? null,
  };
}

async function hydrateLastChatAt(
  token: string,
  activeActor: string,
  sessions: ActivePatientRecovery[],
): Promise<ActivePatientRecovery[]> {
  let lastByPatient = new Map<string, string | null>();
  try {
    lastByPatient = await fetchLastChatActivityByPatient(
      token,
      activeActor,
      sessions.map(session => ({
        user_uuid: session.patientUuid,
      })),
    );
  } catch (error) {
    // Chat enrichment should never blank the clinician roster.
    console.warn('Failed to fetch chat last activity', error);
  }

  return sessions.map(session => ({
    ...session,
    lastChatAt: lastByPatient.get(session.patientUuid) ?? session.lastChatAt,
  }));
}

export function usePatientRegistry(
  token: string | undefined,
  activeActor: string,
  tenantUuid?: string | null,
): PatientRegistryState {
  const [patients, setPatients] = useState<ActivePatientRecovery[]>([]);
  const [registryUsers, setRegistryUsers] = useState<RegistryPatientUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken(value => value + 1);
  }, []);

  const enrollInPostCare = useCallback(
    async (input: PostCareEnrollmentInput): Promise<PostCareEnrollmentResult> => {
      if (!token || activeActor !== 'clinician') {
        throw new Error('Sign in as a clinician to enroll patients.');
      }
      const result = await enrollPatientInPostCare(token, activeActor, input);
      reload();
      return result;
    },
    [token, activeActor, reload],
  );

  useEffect(() => {
    if (!token || activeActor !== 'clinician' || !tenantUuid) {
      setPatients([]);
      setRegistryUsers([]);
      setLoading(false);
      setError(tenantUuid ? null : 'Tenant context is required to load the patient registry.');
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchWithRetry(
          tenantUsersListPath(tenantUuid, `page=1&page_size=${PATIENT_PAGE_SIZE}`),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Active-Actor': activeActor,
            },
          },
        );

        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(`User registry returned HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
        }

        const data = (await res.json()) as UserListResponse;
        const allPatientUsers = data.items.filter(isRegistryPatient);

        const merged = mergePatientRecoveries(allPatientUsers);
        const episodeRecoveries = await listCareEpisodeRecoveries(token, activeActor, tenantUuid);
        const usersByUuid = new Map(allPatientUsers.map(user => [user.uuid, user]));
        const mergedByUuid = new Map(merged.map(session => [session.patientUuid, session]));

        for (const care of episodeRecoveries) {
          const existing = mergedByUuid.get(care.user_uuid);
          if (existing) {
            mergedByUuid.set(care.user_uuid, {
              ...existing,
              surgery: care.surgery,
              procedureDate: care.procedure_date,
              daysPostOp: care.days_post_op,
              recoveryId: care.recovery_id,
              riskLevel: riskLevelFromApi(care.risk_level),
              riskSummary: care.risk_summary ?? existing.riskSummary ?? null,
            });
            continue;
          }

          // Clinician roster should include active episodes even if registry role is not patient.self.
          mergedByUuid.set(
            care.user_uuid,
            recoveryFromCareEpisode(care, usersByUuid.get(care.user_uuid)),
          );
        }

        const roster = [...mergedByUuid.values()];
        const hydrated = sortPatientRecoveriesByRiskAndRecency(
          await hydrateLastChatAt(token, activeActor, roster),
        );

        if (!cancelled) {
          setRegistryUsers(allPatientUsers);
          setPatients(hydrated);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load patient registry');
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
  }, [token, activeActor, tenantUuid, reloadToken]);

  return { patients, registryUsers, loading, error, reload, enrollInPostCare };
}
