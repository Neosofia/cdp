import { CARE_EPISODE_API } from '@/lib/careEpisodeApi';

const CHAT_API = import.meta.env.VITE_CHAT_API_URL as string | undefined;

export class ChatApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
  }
}

export function isAssistantUnavailableError(error: unknown): boolean {
  return error instanceof ChatApiError && error.status === 503;
}

async function chatApiFetch(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new ChatApiError(`Chat API returned ${res.status}`, res.status);
  }
  return res;
}

export interface ChatMeta {
  assistant?: {
    available?: boolean;
  };
}

export async function fetchChatMeta(
  token: string,
  activeActor: string,
): Promise<ChatMeta> {
  if (!CHAT_API) {
    return { assistant: { available: false } };
  }

  const res = await chatApiFetch(`${CHAT_API}/meta/enums`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
  });
  return (await res.json()) as ChatMeta;
}

export interface ChatMessage {
  message_uuid: string;
  chat_interaction_uuid: string;
  sender_type: 'patient' | 'ai_agent' | 'clinician';
  sender_uuid?: string | null;
  content: string;
  created_at: string;
}

export interface ChatInteraction {
  chat_interaction_uuid: string;
  user_uuid: string;
  started_at: string;
  last_message_at: string | null;
  message_count: number;
  preview: string | null;
}

export interface ChatSessionRef {
  user_uuid: string;
}

export interface LastChatActivity {
  user_uuid: string;
  last_message_at: string | null;
}

export async function fetchLastChatActivityForUser(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<string | null> {
  if (!CHAT_API) {
    return null;
  }

  const res = await fetch(`${CHAT_API}/api/v1/users/${userUuid}/last-activity`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
  });

  if (!res.ok) {
    return null;
  }

  const body = (await res.json()) as LastChatActivity;
  return body.last_message_at;
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

  const results = await Promise.all(
    sessions.map(async session => {
      const lastMessageAt = await fetchLastChatActivityForUser(
        token,
        activeActor,
        session.user_uuid,
      );
      return [session.user_uuid, lastMessageAt] as const;
    }),
  );

  for (const [userUuid, lastMessageAt] of results) {
    byPatient.set(userUuid, lastMessageAt);
  }
  return byPatient;
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

export function chatMessagesHaveIntervention(messages: ChatMessage[]): boolean {
  return messages.some(message => message.sender_type === 'clinician');
}

export function threadMessagesHaveIntervention(messages: PatientThreadMessage[]): boolean {
  return messages.some(message => message.senderType === 'clinician');
}

export interface CreateChatMessageInput {
  sender_type: 'patient' | 'ai_agent' | 'clinician';
  sender_uuid?: string;
  content: string;
}

export async function createChatMessage(
  token: string,
  activeActor: string,
  userUuid: string,
  chatInteractionUuid: string,
  input: CreateChatMessageInput,
): Promise<ChatMessage | null> {
  if (!CHAT_API) return null;

  const res = await chatApiFetch(
    `${CHAT_API}/api/v1/users/${userUuid}/interactions/${chatInteractionUuid}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Active-Actor': activeActor,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  return (await res.json()) as ChatMessage;
}

export async function listChatInteractions(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<ChatInteraction[]> {
  if (!CHAT_API) return [];

  const res = await fetch(`${CHAT_API}/api/v1/users/${userUuid}/interactions`, {
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
  userUuid: string,
): Promise<ChatInteraction> {
  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/${userUuid}/chat/interactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Care episode API returned ${res.status}`);
  }

  return (await res.json()) as ChatInteraction;
}

export async function resolveLatestChatInteractionUuid(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<string | null> {
  const interactions = await listChatInteractions(token, activeActor, userUuid);
  return interactions[0]?.chat_interaction_uuid ?? null;
}

export async function loadPatientChatHistory(
  token: string,
  activeActor: string,
  userUuid: string,
  chatInteractionUuid: string,
): Promise<PatientThreadMessage[]> {
  const messages = await listChatMessages(token, activeActor, userUuid, chatInteractionUuid);
  return messages.map(toPatientThreadMessage);
}

export interface PatientCompletionInput {
  content: string;
  sender_uuid?: string;
}

export interface PatientCompletionResult {
  message: string | null;
  user_message?: ChatMessage;
  assistant_message?: ChatMessage;
  intervention?: boolean;
}

/** Prime an empty thread with the server session-start prompt and persist the greeting. */
export async function requestChatSessionStart(
  token: string,
  activeActor: string,
  userUuid: string,
  chatInteractionUuid: string,
): Promise<PatientCompletionResult> {
  const res = await chatApiFetch(
    `${CARE_EPISODE_API}/api/v1/care-episodes/${userUuid}/chat/interactions/${chatInteractionUuid}/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Active-Actor': activeActor,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_start: true,
      }),
    },
  );

  return (await res.json()) as PatientCompletionResult;
}

/** Persist patient turn, load thread from DB, call assistant, persist reply. */
export async function requestPatientCompletion(
  token: string,
  activeActor: string,
  userUuid: string,
  chatInteractionUuid: string,
  input: PatientCompletionInput,
): Promise<PatientCompletionResult> {
  const res = await chatApiFetch(
    `${CARE_EPISODE_API}/api/v1/care-episodes/${userUuid}/chat/interactions/${chatInteractionUuid}/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Active-Actor': activeActor,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  return (await res.json()) as PatientCompletionResult;
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
  userUuid: string,
  chatInteractionUuid: string,
): Promise<ChatMessage[]> {
  if (!CHAT_API) return [];

  const res = await fetch(
    `${CHAT_API}/api/v1/users/${userUuid}/interactions/${chatInteractionUuid}/messages`,
    {
      headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
    },
  );

  if (!res.ok) return [];
  const body = (await res.json()) as { items?: ChatMessage[] };
  return sortChatMessagesBySentAt(body.items ?? []);
}

/** Interaction UUIDs where a human has taken over the thread (AI paused). */
export async function interactionsWithIntervention(
  token: string,
  activeActor: string,
  userUuid: string,
  interactionUuids: string[],
): Promise<Set<string>> {
  if (!CHAT_API || interactionUuids.length === 0) {
    return new Set();
  }

  const engaged = await Promise.all(
    interactionUuids.map(async interactionUuid => {
      const messages = await listChatMessages(token, activeActor, userUuid, interactionUuid);
      return chatMessagesHaveIntervention(messages) ? interactionUuid : null;
    }),
  );

  return new Set(engaged.filter((uuid): uuid is string => uuid !== null));
}
