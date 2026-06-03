const CHAT_API = import.meta.env.VITE_CHAT_API_URL as string | undefined;

export interface ChatMessage {
  message_uuid: string;
  patient_uuid: string;
  care_episode_uuid?: string | null;
  sender_type: 'patient' | 'ai_agent' | 'clinician';
  sender_uuid?: string | null;
  content: string;
  created_at: string;
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

/** Demo and MVP episodes use patient UUID as the care-episode key until invite flow wires episode_uuid. */
export function careEpisodeUuidForPatient(patientUuid: string): string {
  return patientUuid;
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
  patientUuid: string,
  careEpisodeUuid: string,
): Promise<ChatMessage[]> {
  if (!CHAT_API) return [];

  const params = new URLSearchParams({ patient_uuid: patientUuid });
  params.set('care_episode_uuid', careEpisodeUuid);

  const res = await fetch(`${CHAT_API}/api/v1/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
  });

  if (!res.ok) return [];
  const body = (await res.json()) as { items?: ChatMessage[] };
  return sortChatMessagesBySentAt(body.items ?? []);
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
