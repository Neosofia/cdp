const CHAT_API = import.meta.env.VITE_CHAT_API_URL as string | undefined;

export interface ChatMessage {
  message_uuid: string;
  chat_interaction_uuid: string;
  sender_type: 'patient' | 'ai_agent' | 'clinician';
  sender_uuid?: string | null;
  content: string;
  created_at: string;
}

export interface ChatInteractionContext {
  patient_first_name?: string;
  patient_display_name?: string;
  procedure_name?: string;
  procedure_date?: string;
  days_post_op?: number;
  care_episode_uuid?: string;
  tenant_name?: string;
}

export interface ChatInteraction {
  chat_interaction_uuid: string;
  patient_uuid: string;
  care_episode_uuid: string;
  started_at: string;
  last_message_at: string | null;
  message_count: number;
  preview: string | null;
}

export function buildPatientChatInteractionContext(input: {
  patientName?: string;
  patientUuid?: string;
  careEpisodeUuid?: string;
  tenantName?: string;
  surgery?: string;
  procedureDate?: string;
  daysPostOp?: number;
}): ChatInteractionContext {
  const context: ChatInteractionContext = {};
  const displayName = input.patientName?.trim();
  if (displayName) {
    context.patient_display_name = displayName;
    const [firstName] = displayName.split(/\s+/);
    if (firstName) {
      context.patient_first_name = firstName;
    }
  }
  const surgery = input.surgery?.trim();
  if (surgery) {
    context.procedure_name = surgery;
  }
  const procedureDate = input.procedureDate?.trim();
  if (procedureDate) {
    context.procedure_date = procedureDate;
  }
  if (typeof input.daysPostOp === 'number' && Number.isFinite(input.daysPostOp)) {
    context.days_post_op = input.daysPostOp;
  }
  if (input.careEpisodeUuid) {
    context.care_episode_uuid = input.careEpisodeUuid;
  }
  const tenantName = input.tenantName?.trim();
  if (tenantName) {
    context.tenant_name = tenantName;
  }
  return context;
}

export interface ChatSessionRef {
  patient_uuid: string;
  care_episode_uuid: string;
}

export interface LastChatActivityItem {
  patient_uuid: string;
  care_episode_uuid: string;
  last_message_at: string | null;
}

/** Catalog template patient (PAT-2847). See care-episode/src/data/demo_patient_template.json */
export const DEMO_CHAT_TEMPLATE_PATIENT_UUID = '00000000-0000-7000-8000-000000002847';

/** Demo and MVP episodes use patient UUID as the care-episode key until invite flow wires episode_uuid. */
export function careEpisodeUuidForPatient(patientUuid: string): string {
  return patientUuid;
}

export function isChatServiceConfigured(): boolean {
  return Boolean(CHAT_API);
}

export function sortChatMessagesBySentAt(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const sentA = Date.parse(a.created_at);
    const sentB = Date.parse(b.created_at);
    const timeA = Number.isFinite(sentA) ? sentA : 0;
    const timeB = Number.isFinite(sentB) ? sentB : 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.message_uuid.localeCompare(b.message_uuid);
  });
}

export function formatChatInteractionLabel(interaction: ChatInteraction): string {
  if (interaction.preview) {
    return interaction.preview;
  }
  return 'New conversation';
}

/** Most recent activity: last message time, or interaction started/changed time when empty. */
export function formatChatInteractionActivityDate(interaction: ChatInteraction): string {
  const activityAt = interaction.last_message_at ?? interaction.started_at;
  const activity = new Date(activityAt);
  if (Number.isNaN(activity.getTime())) {
    return '';
  }
  return activity.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export interface PatientThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  senderType: ChatMessage['sender_type'];
  senderUuid?: string | null;
  content: string;
  createdAt: Date;
}

export function toPatientThreadMessage(message: ChatMessage): PatientThreadMessage {
  const createdAt = new Date(message.created_at);
  return {
    id: message.message_uuid,
    role: message.sender_type === 'patient' ? 'user' : 'assistant',
    senderType: message.sender_type,
    senderUuid: message.sender_uuid ?? null,
    content: message.content,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
  };
}

export function chatMessagesHaveClinicianIntervention(messages: ChatMessage[]): boolean {
  return messages.some(message => message.sender_type === 'clinician');
}

export function threadMessagesHaveClinicianIntervention(messages: PatientThreadMessage[]): boolean {
  return messages.some(message => message.senderType === 'clinician');
}

export interface CreateChatMessageInput {
  chat_interaction_uuid: string;
  sender_type: 'patient' | 'ai_agent' | 'clinician';
  sender_uuid?: string;
  content: string;
}

export async function createChatMessage(
  token: string,
  activeActor: string,
  input: CreateChatMessageInput,
): Promise<ChatMessage | null> {
  if (!CHAT_API) return null;

  const res = await fetch(`${CHAT_API}/api/v1/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Chat API returned ${res.status}`);
  }

  return (await res.json()) as ChatMessage;
}

export async function listChatInteractions(
  token: string,
  activeActor: string,
  patientUuid: string,
  careEpisodeUuid: string,
): Promise<ChatInteraction[]> {
  if (!CHAT_API) return [];

  const params = new URLSearchParams({
    patient_uuid: patientUuid,
    care_episode_uuid: careEpisodeUuid,
  });

  const res = await fetch(`${CHAT_API}/api/v1/interactions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
  });

  if (!res.ok) {
    throw new Error(`Chat API returned ${res.status}`);
  }

  const body = (await res.json()) as { items?: ChatInteraction[] };
  return body.items ?? [];
}

export async function createChatInteraction(
  token: string,
  activeActor: string,
  patientUuid: string,
  careEpisodeUuid: string,
  context?: ChatInteractionContext,
): Promise<ChatInteraction> {
  if (!CHAT_API) {
    throw new Error('Chat API is not configured');
  }

  const res = await fetch(`${CHAT_API}/api/v1/interactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patient_uuid: patientUuid,
      care_episode_uuid: careEpisodeUuid,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Chat API returned ${res.status}`);
  }

  return (await res.json()) as ChatInteraction;
}

export async function resolveLatestChatInteractionUuid(
  token: string,
  activeActor: string,
  patientUuid: string,
  careEpisodeUuid: string,
): Promise<string | null> {
  const interactions = await listChatInteractions(token, activeActor, patientUuid, careEpisodeUuid);
  return interactions[0]?.chat_interaction_uuid ?? null;
}

export async function loadPatientChatHistory(
  token: string,
  activeActor: string,
  chatInteractionUuid: string,
): Promise<PatientThreadMessage[]> {
  const messages = await listChatMessages(token, activeActor, chatInteractionUuid);
  return messages.map(toPatientThreadMessage);
}

export interface PatientCompletionInput {
  chat_interaction_uuid: string;
  content: string;
  sender_uuid?: string;
}

export interface ChatSessionStartInput {
  chat_interaction_uuid: string;
}

export interface PatientCompletionResult {
  message: string | null;
  patient_message?: ChatMessage;
  assistant_message?: ChatMessage;
  ai_disabled?: boolean;
}

/** Prime an empty thread with the server session-start prompt and persist the greeting. */
export async function requestChatSessionStart(
  token: string,
  activeActor: string,
  input: ChatSessionStartInput,
): Promise<PatientCompletionResult> {
  if (!CHAT_API) {
    throw new Error('Chat API is not configured');
  }

  const res = await fetch(`${CHAT_API}/api/v1/messages/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_interaction_uuid: input.chat_interaction_uuid,
      session_start: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Chat API returned ${res.status}`);
  }

  return (await res.json()) as PatientCompletionResult;
}

/** Persist patient turn, load thread from DB, call assistant, persist reply. */
export async function requestPatientCompletion(
  token: string,
  activeActor: string,
  input: PatientCompletionInput,
): Promise<PatientCompletionResult> {
  if (!CHAT_API) {
    throw new Error('Chat API is not configured');
  }

  const res = await fetch(`${CHAT_API}/api/v1/messages/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Chat API returned ${res.status}`);
  }

  return (await res.json()) as PatientCompletionResult;
}

/** Copy seeded template chat into a demo patient when their thread is still empty. */
export async function clonePatientDemoChat(
  token: string,
  activeActor: string,
  targetPatientUuid: string,
): Promise<boolean> {
  if (!CHAT_API || targetPatientUuid === DEMO_CHAT_TEMPLATE_PATIENT_UUID) {
    return false;
  }

  const careEpisodeUuid = careEpisodeUuidForPatient(targetPatientUuid);
  const existingInteractions = await listChatInteractions(
    token,
    activeActor,
    targetPatientUuid,
    careEpisodeUuid,
  );
  if (existingInteractions.some(interaction => interaction.message_count > 0)) {
    return false;
  }

  const templateEpisodeUuid = careEpisodeUuidForPatient(DEMO_CHAT_TEMPLATE_PATIENT_UUID);
  const templateInteractionUuid = await resolveLatestChatInteractionUuid(
    token,
    activeActor,
    DEMO_CHAT_TEMPLATE_PATIENT_UUID,
    templateEpisodeUuid,
  );
  if (!templateInteractionUuid) {
    return false;
  }

  const templateMessages = await listChatMessages(token, activeActor, templateInteractionUuid);
  if (templateMessages.length === 0) {
    return false;
  }

  const targetInteraction = await createChatInteraction(
    token,
    activeActor,
    targetPatientUuid,
    careEpisodeUuid,
  );

  for (const message of templateMessages) {
    await createChatMessage(token, activeActor, {
      chat_interaction_uuid: targetInteraction.chat_interaction_uuid,
      sender_type: message.sender_type,
      sender_uuid: message.sender_type === 'patient' ? targetPatientUuid : undefined,
      content: message.content,
    });
  }

  return true;
}

export function formatChatMessageTime(iso: string): string {
  const sent = new Date(iso);
  if (Number.isNaN(sent.getTime())) return '';
  const now = new Date();
  const clock = sent.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sent.toDateString() === now.toDateString()) {
    return clock;
  }
  return `${sent.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${clock}`;
}

export async function listChatMessages(
  token: string,
  activeActor: string,
  chatInteractionUuid: string,
): Promise<ChatMessage[]> {
  if (!CHAT_API) return [];

  const params = new URLSearchParams({
    chat_interaction_uuid: chatInteractionUuid,
  });

  const res = await fetch(`${CHAT_API}/api/v1/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
  });

  if (!res.ok) return [];
  const body = (await res.json()) as { items?: ChatMessage[] };
  return sortChatMessagesBySentAt(body.items ?? []);
}

/** Interaction UUIDs where a clinician has joined the thread (care assistant paused). */
export async function interactionsWithClinicianEngagement(
  token: string,
  activeActor: string,
  interactionUuids: string[],
): Promise<Set<string>> {
  if (!CHAT_API || interactionUuids.length === 0) {
    return new Set();
  }

  const engaged = await Promise.all(
    interactionUuids.map(async interactionUuid => {
      const messages = await listChatMessages(token, activeActor, interactionUuid);
      return chatMessagesHaveClinicianIntervention(messages) ? interactionUuid : null;
    }),
  );

  return new Set(engaged.filter((uuid): uuid is string => uuid !== null));
}

export async function fetchLastChatActivityByPatient(
  token: string,
  activeActor: string,
  sessions: ChatSessionRef[],
): Promise<Map<string, string | null>> {
  const byPatient = new Map<string, string | null>();
  if (!CHAT_API || sessions.length === 0) {
    return byPatient;
  }

  const res = await fetch(`${CHAT_API}/api/v1/messages/last-activity`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items: sessions }),
  });

  if (!res.ok) {
    return byPatient;
  }

  const body = (await res.json()) as { items?: LastChatActivityItem[] };
  for (const item of body.items ?? []) {
    byPatient.set(item.patient_uuid, item.last_message_at);
  }
  return byPatient;
}
