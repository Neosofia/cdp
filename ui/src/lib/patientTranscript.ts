import { listCareEpisodeTranscript } from '@/lib/careEpisodeApi';
import {
  careEpisodeUuidForPatient,
  formatChatMessageTime,
  listChatMessages,
} from '@/lib/chatApi';

export interface PatientTranscriptLine {
  id: string;
  role: 'patient' | 'assistant';
  content: string;
  time: string;
}

/** Chat service is canonical; care-episode transcript backs demo until chat is seeded. */
export async function loadPatientTranscript(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<PatientTranscriptLine[]> {
  const careEpisodeUuid = careEpisodeUuidForPatient(patientUuid);
  const chatMessages = await listChatMessages(token, activeActor, patientUuid, careEpisodeUuid);
  if (chatMessages.length > 0) {
    return chatMessages.map(msg => ({
      id: `chat-${msg.message_uuid}`,
      role: msg.sender_type === 'patient' ? 'patient' : 'assistant',
      content: msg.content,
      time: formatChatMessageTime(msg.created_at),
    }));
  }

  const episodeLines = await listCareEpisodeTranscript(token, activeActor, patientUuid);
  return episodeLines.map(line => ({
    id: `episode-${line.id}`,
    role: line.role,
    content: line.content,
    time: line.time,
  }));
}
