import {
  formatChatMessageTime,
  listChatInteractions,
  listChatMessages,
  type ChatInteraction,
  type ChatMessage,
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
  userUuid: string,
  chatInteractionUuid: string,
): Promise<PatientTranscriptLine[]> {
  const chatMessages = await listChatMessages(token, activeActor, userUuid, chatInteractionUuid);
  return chatMessages.map(chatMessageToTranscriptLine);
}

export async function listPatientChatInteractions(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<ChatInteraction[]> {
  try {
    return await listChatInteractions(token, activeActor, patientUuid);
  } catch (error) {
    console.warn('Failed to list chat interactions for clinician transcript', error);
    return [];
  }
}
