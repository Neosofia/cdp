import { clonePatientDemoChat, isChatServiceConfigured } from '@/lib/chatApi';
import { clonePatientDemoCareEpisode, isCareEpisodeServiceConfigured } from '@/lib/careEpisodeApi';

export interface EnsurePatientDemoContextInput {
  patientUuid: string;
  tenantUuid: string;
  displayName: string;
  displayCode: string;
}

/** Tier-1 actors allowed to call clone-demo (must appear in JWT session actors). */
const CLONE_DEMO_ACTOR_PRIORITY = ['operator', 'clinician', 'patient'] as const;

function resolveCloneActor(sessionActors: string[]): string | undefined {
  return CLONE_DEMO_ACTOR_PRIORITY.find((actor) => sessionActors.includes(actor));
}

/** Idempotent: copies template chat into the patient thread when still empty. */
export async function ensurePatientDemoChat(
  token: string,
  sessionActors: string[],
  patientUuid: string,
): Promise<void> {
  if (!isChatServiceConfigured()) {
    return;
  }

  const cloneActor = resolveCloneActor(sessionActors);
  if (!cloneActor) {
    return;
  }

  try {
    await clonePatientDemoChat(token, cloneActor, patientUuid);
  } catch (err) {
    console.warn('Patient demo chat clone failed', err);
  }
}

/**
 * Clone seeded template demo data via care-episode when switching to the patient role.
 * Uses the first eligible JWT actor (operator, then clinician, then patient self).
 */
export async function ensurePatientDemoContext(
  token: string,
  sessionActors: string[],
  input: EnsurePatientDemoContextInput,
): Promise<boolean> {
  if (!isCareEpisodeServiceConfigured()) {
    return false;
  }

  const cloneActor = resolveCloneActor(sessionActors);
  if (!cloneActor) {
    return false;
  }

  try {
    const result = await clonePatientDemoCareEpisode(token, cloneActor, input.patientUuid, {
      tenant_uuid: input.tenantUuid,
      display_name: input.displayName,
      display_code: input.displayCode,
    });
    return result !== null;
  } catch (err) {
    console.warn('Patient demo clone failed', err);
    return false;
  }
}
