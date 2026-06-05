import {
  careEpisodeUuidForPatient,
  formatChatMessageTime,
  listChatInteractions,
  listChatMessages,
  type ChatInteraction,
  type ChatMessage,
  resolveLatestChatInteractionUuid,
} from '@/lib/chatApi';

export type PatientTranscriptRole = 'patient' | 'assistant' | 'clinician';

export interface PatientTranscriptLine {
  id: string;
  role: PatientTranscriptRole;
  content: string;
  time: string;
}

export function transcriptRoleForSender(senderType: ChatMessage['sender_type']): PatientTranscriptRole {
  if (senderType === 'patient') {
    return 'patient';
  }
  if (senderType === 'clinician') {
    return 'clinician';
  }
  return 'assistant';
}

export function transcriptHasClinicianMessage(lines: PatientTranscriptLine[]): boolean {
  return lines.some(line => line.role === 'clinician');
}

export function chatMessageToTranscriptLine(message: ChatMessage): PatientTranscriptLine {
  return {
    id: `chat-${message.message_uuid}`,
    role: transcriptRoleForSender(message.sender_type),
    content: message.content,
    time: formatChatMessageTime(message.created_at),
  };
}

/** Chat service is the single source of truth for patient/clinician conversation views. */
export async function loadPatientTranscriptForInteraction(
  token: string,
  activeActor: string,
  chatInteractionUuid: string,
): Promise<PatientTranscriptLine[]> {
  const chatMessages = await listChatMessages(token, activeActor, chatInteractionUuid);
  return chatMessages.map(chatMessageToTranscriptLine);
}

export async function listPatientChatInteractions(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<ChatInteraction[]> {
  try {
    const careEpisodeUuid = careEpisodeUuidForPatient(patientUuid);
    return await listChatInteractions(token, activeActor, patientUuid, careEpisodeUuid);
  } catch (error) {
    console.warn('Failed to list chat interactions for clinician transcript', error);
    return [];
  }
}

export async function loadPatientTranscript(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<PatientTranscriptLine[]> {
  try {
    const careEpisodeUuid = careEpisodeUuidForPatient(patientUuid);
    const chatInteractionUuid = await resolveLatestChatInteractionUuid(
      token,
      activeActor,
      patientUuid,
      careEpisodeUuid,
    );
    if (!chatInteractionUuid) {
      return [];
    }
    return loadPatientTranscriptForInteraction(token, activeActor, chatInteractionUuid);
  } catch (error) {
    console.warn('Failed to load patient transcript', error);
    return [];
  }
}
