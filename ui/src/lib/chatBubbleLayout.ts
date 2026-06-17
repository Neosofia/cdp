import type { ChatMessage } from '@/lib/chatApi';
import type { PatientTranscriptRole } from '@/lib/patientTranscript';

export interface ChatBubbleLayout {
  alignEnd: boolean;
  useUserBubble: boolean;
  offsetClass: string;
  tailClass: string;
  showSparkles: boolean;
  markdown: boolean;
}

/**
 * Thread bubble insets (both views):
 * - Edge (incoming on left / outgoing on right): ml-3 & mr-3 (~12px)
 * - AI deeper inset: ml-10 (clinician view, left) & mr-10 (patient view, right)
 */
const THREAD_EDGE_INSET_START = 'ml-3';
const THREAD_EDGE_INSET_END = 'mr-3';
/** Extra inset for AI bubbles (left in clinician view, right in patient view). */
const AI_LEFT_INSET = 'ml-10';
const AI_RIGHT_INSET = 'mr-10';

/** Clinician reading a patient thread: patient left, AI left (deeper inset), clinician right. */
export function clinicianTranscriptBubbleLayout(role: PatientTranscriptRole): ChatBubbleLayout {
  switch (role) {
    case 'clinician':
      return {
        alignEnd: true,
        useUserBubble: true,
        offsetClass: THREAD_EDGE_INSET_END,
        tailClass: 'rounded-br-md',
        showSparkles: false,
        markdown: true,
      };
    case 'patient':
      return {
        alignEnd: false,
        useUserBubble: true,
        offsetClass: THREAD_EDGE_INSET_START,
        tailClass: 'rounded-bl-md',
        showSparkles: false,
        markdown: false,
      };
    case 'assistant':
      return {
        alignEnd: false,
        useUserBubble: false,
        offsetClass: AI_LEFT_INSET,
        tailClass: 'rounded-bl-md',
        showSparkles: true,
        markdown: true,
      };
  }
}

/** Patient reading their thread: clinician left (ml-3), AI right (mr-10), patient right (mr-3). */
export function patientThreadBubbleLayout(
  role: 'user' | 'assistant',
  senderType: ChatMessage['sender_type'],
): ChatBubbleLayout {
  if (role === 'user') {
    return {
      alignEnd: true,
      useUserBubble: true,
      offsetClass: THREAD_EDGE_INSET_END,
      tailClass: 'rounded-br-md',
      showSparkles: false,
      markdown: false,
    };
  }

  if (senderType === 'clinician') {
    return {
      alignEnd: false,
      useUserBubble: true,
      offsetClass: THREAD_EDGE_INSET_START,
      tailClass: 'rounded-bl-md',
      showSparkles: false,
      markdown: true,
    };
  }

  return {
    alignEnd: true,
    useUserBubble: false,
    offsetClass: AI_RIGHT_INSET,
    tailClass: 'rounded-br-md',
    showSparkles: true,
    markdown: true,
  };
}
