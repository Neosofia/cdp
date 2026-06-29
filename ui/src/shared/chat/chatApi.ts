import type { components } from '@/shared/api/generated/chat.schema';
import type { components as CareEpisodeComponents } from '@/shared/api/generated/care-episode.schema';
import { careEpisodeApiClient, chatApiClient } from '@/shared/api/serviceApiClients';
import { CHAT_API } from '@/shared/platform/apiBases';
import { apiErrorMessage } from '@/shared/platform/platformApiFetch';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

type ChatInteractionCreateResponse =
  CareEpisodeComponents['schemas']['ChatInteractionCreateResponse'];

export type ChatMessage = components['schemas']['Message'];
export type ChatInteraction = components['schemas']['ChatInteraction'];
export type MessageSenderType = 'patient' | 'ai_agent' | 'clinician';
export type ChatDisplayRole = 'patient' | 'assistant' | 'clinician';

export interface ChatDisplayMessage {
  id: string;
  role: ChatDisplayRole;
  senderType: MessageSenderType;
  senderUuid: string | null;
  content: string;
  createdAt: Date;
  time: string;
}

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

function unwrapChatResponse<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (result.error !== undefined) {
    throw new ChatApiError(apiErrorMessage(result.error, result.response.status), result.response.status);
  }
  if (result.data === undefined) {
    throw new ChatApiError(`HTTP ${result.response.status}`, result.response.status);
  }
  return result.data;
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

  try {
    const client = chatApiClient(token, activeActor);
    const body = unwrapChatResponse(await client.GET('/meta/enums'));
    return {
      assistant: {
        available: Boolean(body.enums?.MessageSenderType),
      },
    };
  } catch {
    return { assistant: { available: false } };
  }
}

export interface ChatSessionRef {
  user_uuid: string;
}

export async function fetchTenantLastChatActivity(
  token: string,
  activeActor: string,
  tenantUuid: string,
): Promise<Map<string, string | null>> {
  const byPatient = new Map<string, string | null>();
  if (!CHAT_API || !tenantUuid) {
    return byPatient;
  }

  try {
    const client = chatApiClient(token, activeActor);
    const body = unwrapChatResponse(
      await client.GET('/api/v1/tenants/{tenant_uuid}/last-activity', {
        params: { path: { tenant_uuid: tenantUuid } },
      }),
    );
    for (const item of body.items ?? []) {
      byPatient.set(item.user_uuid, item.last_message_at);
    }
  } catch {
    // Optional enrichment.
  }
  return byPatient;
}

export async function fetchLastChatActivityByPatient(
  token: string,
  activeActor: string,
  tenantUuid: string,
  sessions: ChatSessionRef[],
): Promise<Map<string, string | null>> {
  if (!CHAT_API || sessions.length === 0 || !tenantUuid) {
    return new Map();
  }

  const byPatient = await fetchTenantLastChatActivity(token, activeActor, tenantUuid);
  const scoped = new Map<string, string | null>();
  for (const session of sessions) {
    scoped.set(session.user_uuid, byPatient.get(session.user_uuid) ?? null);
  }
  return scoped;
}

export async function listChatMessages(
  token: string,
  activeActor: string,
  userUuid: string,
  chatInteractionUuid: string,
): Promise<ChatMessage[]> {
  if (!CHAT_API) return [];

  const client = chatApiClient(token, activeActor);
  const body = unwrapChatResponse(
    await client.GET('/api/v1/users/{user_uuid}/interactions/{chat_interaction_uuid}/messages', {
      params: {
        path: { user_uuid: userUuid, chat_interaction_uuid: chatInteractionUuid },
      },
    }),
  );
  return body.items ?? [];
}

export function listableChatInteractions(interactions: ChatInteraction[]): ChatInteraction[] {
  return interactions.filter((interaction) => interaction.message_count > 0);
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

function displayRole(senderType: string): ChatDisplayRole {
  if (senderType === 'patient') {
    return 'patient';
  }
  if (senderType === 'clinician') {
    return 'clinician';
  }
  return 'assistant';
}

function senderTypeFromMessage(message: ChatMessage): MessageSenderType {
  if (
    message.sender_type === 'patient' ||
    message.sender_type === 'ai_agent' ||
    message.sender_type === 'clinician'
  ) {
    return message.sender_type;
  }
  return 'ai_agent';
}

export function toChatDisplayMessage(message: ChatMessage): ChatDisplayMessage {
  const createdAt = new Date(message.created_at);
  return {
    id: message.message_uuid,
    role: displayRole(message.sender_type),
    senderType: senderTypeFromMessage(message),
    senderUuid: message.sender_uuid ?? null,
    content: message.content,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
    time: formatChatMessageTime(message.created_at),
  };
}

export function chatMessagesHaveIntervention(messages: ChatMessage[]): boolean {
  return messages.some((message) => message.sender_type === 'clinician');
}

export function chatDisplayHasClinician(messages: ChatDisplayMessage[]): boolean {
  return messages.some((message) => message.role === 'clinician');
}

export interface CreateChatMessageInput {
  sender_type: MessageSenderType;
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

  const client = chatApiClient(token, activeActor);
  return unwrapChatResponse(
    await client.POST('/api/v1/users/{user_uuid}/interactions/{chat_interaction_uuid}/messages', {
      params: {
        path: { user_uuid: userUuid, chat_interaction_uuid: chatInteractionUuid },
      },
      body: input,
    }),
  );
}

export async function listChatInteractions(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<ChatInteraction[]> {
  if (!CHAT_API) return [];

  const client = chatApiClient(token, activeActor);
  const body = unwrapChatResponse(
    await client.GET('/api/v1/users/{user_uuid}/interactions', {
      params: { path: { user_uuid: userUuid } },
    }),
  );
  return listableChatInteractions(body.items ?? []);
}

function mapCreateInteractionResponse(body: ChatInteractionCreateResponse): ChatInteraction {
  return {
    chat_interaction_uuid: body.chat_interaction_uuid,
    user_uuid: body.user_uuid,
    started_at: body.started_at,
    last_message_at: body.last_message_at ?? null,
    message_count: body.message_count ?? 0,
    preview: body.preview ?? null,
  };
}

export async function createChatInteraction(
  token: string,
  activeActor: string,
  userUuid: string,
  patientDisplayName?: string,
): Promise<ChatInteraction> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.POST('/api/v1/care-episodes/{patient_uuid}/chat/interactions', {
      params: { path: { patient_uuid: userUuid } },
      body: patientDisplayName?.trim()
        ? { patient_display_name: patientDisplayName.trim() }
        : undefined,
    }),
  );
  return mapCreateInteractionResponse(body);
}

export async function loadPatientChatHistory(
  token: string,
  activeActor: string,
  userUuid: string,
  chatInteractionUuid: string,
): Promise<ChatDisplayMessage[]> {
  const messages = await listChatMessages(token, activeActor, userUuid, chatInteractionUuid);
  return messages.map(toChatDisplayMessage);
}

export interface PatientCompletionInput {
  content: string;
  sender_uuid?: string;
  patient_display_name?: string;
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
  const client = careEpisodeApiClient(token, activeActor);
  return unwrapChatResponse(
    await client.POST(
      '/api/v1/care-episodes/{patient_uuid}/chat/interactions/{chat_interaction_uuid}/completions',
      {
        params: {
          path: { patient_uuid: userUuid, chat_interaction_uuid: chatInteractionUuid },
        },
        body: { session_start: true },
      },
    ),
  ) as unknown as PatientCompletionResult;
}

/** Persist patient turn, load thread from DB, call assistant, persist reply. */
export async function requestPatientCompletion(
  token: string,
  activeActor: string,
  userUuid: string,
  chatInteractionUuid: string,
  input: PatientCompletionInput,
): Promise<PatientCompletionResult> {
  const client = careEpisodeApiClient(token, activeActor);
  return unwrapChatResponse(
    await client.POST(
      '/api/v1/care-episodes/{patient_uuid}/chat/interactions/{chat_interaction_uuid}/completions',
      {
        params: {
          path: { patient_uuid: userUuid, chat_interaction_uuid: chatInteractionUuid },
        },
        body: input,
      },
    ),
  ) as unknown as PatientCompletionResult;
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
    interactionUuids.map(async (interactionUuid) => {
      const messages = await listChatMessages(token, activeActor, userUuid, interactionUuid);
      return chatMessagesHaveIntervention(messages) ? interactionUuid : null;
    }),
  );

  return new Set(engaged.filter((uuid): uuid is string => uuid !== null));
}
