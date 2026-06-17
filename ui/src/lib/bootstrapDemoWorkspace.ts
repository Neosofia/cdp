import {
  listCareEpisodeAppointments,
  listCareEpisodeInboxMessages,
  listCareEpisodeRecords,
  listCareEpisodeRecoveries,
  upsertCareEpisodeAppointments,
  upsertCareEpisodeInboxMessages,
  upsertCareEpisodeRecords,
  upsertCareEpisodeRecovery,
  type CareEpisodeAppointment,
  type CareEpisodeInboxMessage,
  type CareEpisodeRecordUpsertItem,
} from '@/lib/careEpisodeApi';
import {
  buildUserUpdatePayload,
  tenantUsersListPath,
  type RegistryUser,
} from '@/lib/userRegistryApi';

const USER_API = import.meta.env.VITE_USER_API_URL ?? 'http://localhost:8018';
const DEMO_ACTOR = 'demo';
const DEMO_TEMPLATE_DISPLAY_CODE =
  (import.meta.env.VITE_DEMO_TEMPLATE_DISPLAY_CODE as string | undefined)?.trim() || 'DEMO-123';
const DEMO_TEMPLATE_PATIENT_UUID =
  (import.meta.env.VITE_DEMO_TEMPLATE_PATIENT_UUID as string | undefined)?.trim()
  || '00000000-0000-7000-8000-000000002847';

export const DEMO_TIER2_ROLES = ['patient.self', 'site.clinical'] as const;

const APPOINTMENT_OFFSETS: Array<[number, number, number]> = [
  [2, 10, 30],
  [8, 14, 0],
  [23, 9, 0],
];

const INBOX_SENT_AGO_MS = [
  60 * 60 * 1000,
  3 * 60 * 60 * 1000,
  26 * 60 * 60 * 1000,
];

function headers(token: string, activeActor: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'X-Active-Actor': activeActor,
    'Content-Type': 'application/json',
  };
}

export function sessionHasDemoActor(sessionActors: string[]): boolean {
  return sessionActors.includes(DEMO_ACTOR);
}

export function profileHasDemoRoles(roles: string[] | undefined): boolean {
  if (!roles?.length) {
    return false;
  }
  return DEMO_TIER2_ROLES.every((role) => roles.includes(role));
}

/** Add demo tier-2 roles without removing existing slugs (e.g. platform.admin). */
export function mergeDemoTier2Roles(currentRoles: string[] | undefined): string[] {
  const merged = new Set(currentRoles ?? []);
  for (const role of DEMO_TIER2_ROLES) {
    merged.add(role);
  }
  return [...merged];
}

async function resolveTemplatePatientUuid(
  token: string,
  tenantUuid: string,
): Promise<string> {
  if (DEMO_TEMPLATE_PATIENT_UUID) {
    return DEMO_TEMPLATE_PATIENT_UUID;
  }
  const res = await fetch(
    tenantUsersListPath(tenantUuid, `q=${encodeURIComponent(DEMO_TEMPLATE_DISPLAY_CODE)}&page=1&page_size=5`),
    { headers: headers(token, DEMO_ACTOR) },
  );
  if (!res.ok) {
    throw new Error(`Failed to resolve demo template patient: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { items?: Array<{ uuid: string; display_code: string | null }> };
  const match = (body.items ?? []).find(
    (item) => item.display_code?.trim().toUpperCase() === DEMO_TEMPLATE_DISPLAY_CODE.toUpperCase(),
  );
  if (!match?.uuid) {
    throw new Error(`Demo template patient ${DEMO_TEMPLATE_DISPLAY_CODE} was not found. Run platform seed.`);
  }
  return match.uuid;
}

async function assignDemoRoles(
  token: string,
  userUuid: string,
  currentRoles: string[] | undefined,
): Promise<RegistryUser> {
  let rolesToMerge = currentRoles;
  try {
    const latestRes = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
      headers: headers(token, DEMO_ACTOR),
    });
    if (latestRes.ok) {
      const latest = (await latestRes.json()) as RegistryUser;
      rolesToMerge = latest.roles;
    }
  } catch {
    // Fall back to caller-provided roles when the registry read fails.
  }

  const res = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
    method: 'PATCH',
    headers: headers(token, DEMO_ACTOR),
    body: JSON.stringify(buildUserUpdatePayload({ roles: mergeDemoTier2Roles(rolesToMerge) })),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(`Failed to assign demo roles: ${message}`);
  }
  return body as RegistryUser;
}

function scheduledAtForDemoAppointment(now: Date, index: number): string {
  const offsets = APPOINTMENT_OFFSETS[index] ?? APPOINTMENT_OFFSETS[APPOINTMENT_OFFSETS.length - 1];
  const [days, hours, minutes] = offsets;
  const extraWeeks = Math.max(0, index - APPOINTMENT_OFFSETS.length + 1);
  const date = new Date(now.getTime());
  date.setUTCDate(date.getUTCDate() + days + extraWeeks * 7);
  date.setUTCHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function sentAtForDemoMessage(now: Date, index: number): string {
  const ago = INBOX_SENT_AGO_MS[index] ?? 6 * 60 * 60 * 1000 * (index + 1);
  return new Date(now.getTime() - ago).toISOString();
}

function readAtForDemoMessage(now: Date, index: number, templateHadRead: boolean): string | null {
  if (!templateHadRead) {
    return null;
  }
  if (index === 2) {
    return new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
  }
  return new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
}

function mapRecords(items: Awaited<ReturnType<typeof listCareEpisodeRecords>>): CareEpisodeRecordUpsertItem[] {
  return items.map((row) => ({
    title: row.title,
    date: row.date,
    type: row.type,
    provider: row.provider,
    summary: row.summary,
    imageKey: row.imageKey,
  }));
}

function mapAppointments(
  items: CareEpisodeAppointment[],
  now: Date,
): Array<{
  clinician_user_uuid: string;
  clinician_display_name: string;
  specialty: string;
  scheduled_at: string;
  status: string;
}> {
  return [...items]
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((row, index) => ({
      clinician_user_uuid: row.clinician_user_uuid,
      clinician_display_name: row.clinician_display_name,
      specialty: row.specialty,
      scheduled_at: scheduledAtForDemoAppointment(now, index),
      status: row.status,
    }));
}

function mapMessages(
  items: CareEpisodeInboxMessage[],
  now: Date,
): Array<{
  sender_user_uuid: string | null;
  sender_display_name: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}> {
  return [...items]
    .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    .map((row, index) => ({
      sender_user_uuid: row.sender_user_uuid,
      sender_display_name: row.sender_display_name,
      body: row.body,
      sent_at: sentAtForDemoMessage(now, index),
      read_at: readAtForDemoMessage(now, index, row.read_at !== null),
    }));
}

export interface BootstrapDemoWorkspaceInput {
  token: string;
  userUuid: string;
  tenantUuid: string;
  displayName: string;
  displayCode: string;
  currentRoles?: string[];
}

export interface BootstrapDemoWorkspaceResult {
  rolesAssigned: boolean;
  careEpisodeSeeded: boolean;
  requiresReLogin: boolean;
}

export async function bootstrapDemoWorkspace(
  input: BootstrapDemoWorkspaceInput,
): Promise<BootstrapDemoWorkspaceResult> {
  const { token, userUuid, tenantUuid, displayName, displayCode, currentRoles } = input;

  let rolesAssigned = profileHasDemoRoles(currentRoles);
  let rolesWerePatched = false;
  if (!rolesAssigned) {
    await assignDemoRoles(token, userUuid, currentRoles);
    rolesAssigned = true;
    rolesWerePatched = true;
  }

  const existing = await listCareEpisodeRecoveries(token, 'demo', tenantUuid, {
    includeTenantFilter: true,
  });
  if (existing.some((row) => row.user_uuid === userUuid)) {
    return {
      rolesAssigned,
      careEpisodeSeeded: false,
      requiresReLogin: rolesWerePatched,
    };
  }

  const templateUuid = await resolveTemplatePatientUuid(token, tenantUuid);
  // Catalog template (DEMO-123) is seeded in the platform demo tenant; demo Cedar policy
  // allows reading that patient cross-tenant. Do not scope this lookup to the human's tenant.
  const templateRecoveries = await listCareEpisodeRecoveries(token, DEMO_ACTOR, tenantUuid, {
    includeTenantFilter: false,
  });
  const templateRecovery = templateRecoveries.find((row) => row.user_uuid === templateUuid);
  if (!templateRecovery) {
    throw new Error('Demo template recovery is missing. Run seed_demo_platform.py.');
  }

  const [records, appointments, messages] = await Promise.all([
    listCareEpisodeRecords(token, DEMO_ACTOR, templateUuid),
    listCareEpisodeAppointments(token, DEMO_ACTOR, templateUuid),
    listCareEpisodeInboxMessages(token, DEMO_ACTOR, templateUuid),
  ]);

  const now = new Date();
  const personalCode = displayCode.trim() || `PAT-${userUuid.slice(-6).toUpperCase()}`;
  const recoveryId = templateRecovery.recovery_id.startsWith('S-')
    ? `S-${personalCode.replace(/^PAT-/i, '')}`
    : `EP-${personalCode}`;

  await upsertCareEpisodeRecovery(token, DEMO_ACTOR, {
    patient_uuid: userUuid,
    tenant_uuid: tenantUuid,
    surgery: templateRecovery.surgery,
    procedure_date: templateRecovery.procedure_date,
    recovery_id: recoveryId,
    risk_level: templateRecovery.risk_level ?? 'low',
  });

  if (records.length > 0) {
    await upsertCareEpisodeRecords(token, DEMO_ACTOR, userUuid, mapRecords(records));
  }
  if (appointments.length > 0) {
    await upsertCareEpisodeAppointments(token, DEMO_ACTOR, userUuid, mapAppointments(appointments, now));
  }
  if (messages.length > 0) {
    await upsertCareEpisodeInboxMessages(token, DEMO_ACTOR, userUuid, mapMessages(messages, now));
  }

  return { rolesAssigned, careEpisodeSeeded: true, requiresReLogin: true };
}
