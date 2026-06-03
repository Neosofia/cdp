import { clonePatientDemoCareEpisode, isCareEpisodeServiceConfigured } from '@/lib/careEpisodeApi';

export interface EnsurePatientDemoContextInput {
  patientUuid: string;
  tenantUuid: string;
  displayName: string;
  displayCode: string;
}

/** Clone seeded template demo data via care-episode (requires operator in session actors). */
export async function ensurePatientDemoContext(
  token: string,
  sessionActors: string[],
  input: EnsurePatientDemoContextInput,
): Promise<boolean> {
  if (!isCareEpisodeServiceConfigured() || !sessionActors.includes('operator')) {
    return false;
  }

  try {
    const result = await clonePatientDemoCareEpisode(token, 'operator', input.patientUuid, {
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
