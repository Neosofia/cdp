import { useCallback, useEffect, useState } from 'react';
import {
  displayNameForUser,
  mergePatientSessions,
  riskLevelFromApi,
  sortPatientSessionsByRiskAndRecency,
  type ActivePatientSession,
  type RegistryPatientUser,
} from '@/lib/demoPatients';
import {
  enrollPatientInPostCare,
  type PostCareEnrollmentInput,
  type PostCareEnrollmentResult,
} from '@/lib/postCareEnrollment';
import { listCareEpisodeSessions, type CareEpisodeSession } from '@/lib/careEpisodeApi';
import { careEpisodeUuidForPatient, fetchLastChatActivityByPatient } from '@/lib/chatApi';

const USER_API = import.meta.env.VITE_USER_API_URL ?? 'http://localhost:8018';
const PATIENT_PAGE_SIZE = 100;
const PATIENT_SELF_ROLE = 'patient.self';

interface UserListResponse {
  items: RegistryPatientUser[];
  total: number;
}

export interface PatientRegistryState {
  patients: ActivePatientSession[];
  registryUsers: RegistryPatientUser[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  enrollInPostCare: (input: PostCareEnrollmentInput) => Promise<PostCareEnrollmentResult>;
}

function isRegistryPatient(user: RegistryPatientUser): boolean {
  return user.roles.includes(PATIENT_SELF_ROLE);
}

function sessionFromCareEpisode(
  care: CareEpisodeSession,
  user?: RegistryPatientUser,
): ActivePatientSession {
  return {
    patientUuid: care.patient_uuid,
    displayCode: care.display_code,
    displayName: user ? displayNameForUser(user) : care.display_name,
    surgery: care.surgery,
    procedureDate: care.procedure_date,
    daysPostOp: care.days_post_op,
    sessionId: care.session_id,
    lastChatAt: null,
    riskLevel: riskLevelFromApi(care.risk_level),
  };
}

async function hydrateLastChatAt(
  token: string,
  activeActor: string,
  sessions: ActivePatientSession[],
): Promise<ActivePatientSession[]> {
  let lastByPatient = new Map<string, string | null>();
  try {
    lastByPatient = await fetchLastChatActivityByPatient(
      token,
      activeActor,
      sessions.map(session => ({
        patient_uuid: session.patientUuid,
        care_episode_uuid: careEpisodeUuidForPatient(session.patientUuid),
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
  const [patients, setPatients] = useState<ActivePatientSession[]>([]);
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
    if (!token || activeActor !== 'clinician') {
      setPatients([]);
      setRegistryUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${USER_API}/api/v1/users?page=1&page_size=${PATIENT_PAGE_SIZE}`,
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
        const tenantScopedUsers = data.items.filter(user => {
          if (tenantUuid && user.tenant_uuid !== tenantUuid) {
            return false;
          }
          return true;
        });
        const scoped = tenantScopedUsers.filter(isRegistryPatient);

        const merged = mergePatientSessions(scoped);
        let episodeSessions = await listCareEpisodeSessions(token, activeActor, tenantUuid);
        if (tenantUuid && episodeSessions.length === 0) {
          // Fallback for stale/misaligned seeded tenant IDs so clinicians don't see an empty dashboard.
          episodeSessions = await listCareEpisodeSessions(
            token,
            activeActor,
            undefined,
            { includeTenantFilter: false },
          );
        }
        const usersByUuid = new Map(tenantScopedUsers.map(user => [user.uuid, user]));
        const mergedByUuid = new Map(merged.map(session => [session.patientUuid, session]));

        for (const care of episodeSessions) {
          const existing = mergedByUuid.get(care.patient_uuid);
          if (existing) {
            mergedByUuid.set(care.patient_uuid, {
              ...existing,
              surgery: care.surgery,
              procedureDate: care.procedure_date,
              daysPostOp: care.days_post_op,
              sessionId: care.session_id,
              riskLevel: riskLevelFromApi(care.risk_level),
            });
            continue;
          }

          // Clinician roster should include active episodes even if registry role is not patient.self.
          mergedByUuid.set(
            care.patient_uuid,
            sessionFromCareEpisode(care, usersByUuid.get(care.patient_uuid)),
          );
        }

        const roster = [...mergedByUuid.values()];
        const hydrated = sortPatientSessionsByRiskAndRecency(
          await hydrateLastChatAt(token, activeActor, roster),
        );

        if (!cancelled) {
          setRegistryUsers(scoped);
          setPatients(hydrated);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setRegistryUsers([]);
          setPatients([]);
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
