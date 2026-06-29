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
  type CareEpisodeInboxMessageUpsertItem,
  type CareEpisodeRecordUpsertItem,
} from '@/shared/care-episode/careEpisodeApi';
import {
  mergeDemoTier2Roles,
  profileHasDemoRoles,
} from '@/shared/auth/demoWorkspaceRoles';
import {
  fetchRegistryUser,
  fetchUserListPage,
  updateUser,
  type RegistryUser,
} from '@/shared/user-registry/userRegistryApi';

const DEMO_ACTOR = 'demo';
const DEMO_TEMPLATE_DISPLAY_CODE =
  (import.meta.env.VITE_DEMO_TEMPLATE_DISPLAY_CODE as string | undefined)?.trim() || 'DEMO-123';
const DEMO_TEMPLATE_PATIENT_UUID =
  (import.meta.env.VITE_DEMO_TEMPLATE_PATIENT_UUID as string | undefined)?.trim()
  || '00000000-0000-7000-8000-000000002847';

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

async function resolveTemplatePatientUuid(
  token: string,
  tenantUuid: string,
): Promise<string> {
  if (DEMO_TEMPLATE_PATIENT_UUID) {
    return DEMO_TEMPLATE_PATIENT_UUID;
  }
  const body = await fetchUserListPage(token, DEMO_ACTOR, {
    tenantUuid,
    page: 1,
    pageSize: 5,
    search: DEMO_TEMPLATE_DISPLAY_CODE,
  });
  const match = body.items.find(
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
    const latest = await fetchRegistryUser(token, DEMO_ACTOR, userUuid);
    rolesToMerge = latest.roles;
  } catch {
    // Fall back to caller-provided roles when the registry read fails.
  }

  return updateUser(token, DEMO_ACTOR, userUuid, {
    roles: mergeDemoTier2Roles(rolesToMerge),
  });
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
): Array<CareEpisodeInboxMessageUpsertItem> {
  return [...items]
    .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    .map((row, index) => ({
      sender_user_uuid: row.sender_user_uuid ?? undefined,
      sender_display_name: row.sender_display_name,
      body: row.body,
      sent_at: sentAtForDemoMessage(now, index),
      read_at: readAtForDemoMessage(now, index, row.read_at !== null) ?? undefined,
    }));
}

export interface BootstrapDemoWorkspaceInput {
  token: string;
  userUuid: string;
  tenantUuid: string;
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
  const { token, userUuid, tenantUuid, displayCode, currentRoles } = input;

  let rolesAssigned = profileHasDemoRoles(currentRoles);
  let rolesWerePatched = false;
  if (!rolesAssigned) {
    await assignDemoRoles(token, userUuid, currentRoles);
    rolesAssigned = true;
    rolesWerePatched = true;
  }

  const existing = await listCareEpisodeRecoveries(token, DEMO_ACTOR, tenantUuid, {
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

export {
  DEMO_TIER2_ROLES,
  mergeDemoTier2Roles,
  profileHasDemoRoles,
  sessionHasDemoActor,
} from '@/shared/auth/demoWorkspaceRoles';
