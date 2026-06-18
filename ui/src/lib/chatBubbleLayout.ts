import type { ChatMessage } from '@/lib/chatApi';
import type { PatientTranscriptRole } from '@/lib/patientTranscript';

export interface ChatBubbleLayout {
  alignEnd: boolean;
  useUserBubble: boolean;
  /** Edge gutter from the thread container (Tailwind spacing scale: 1 = 4px, 3 = 12px). */
  offsetClass: string;
  /** Width constraint paired with flex alignment on the row. */
  sizeClass: string;
  tailClass: string;
  showSparkles: boolean;
  markdown: boolean;
}

/** Mobile scroll is px-0 — edge bubbles carry inset; desktop scroll uses px-3. */
const EDGE_LEFT = 'ml-1 md:ml-0';
const EDGE_RIGHT = 'mr-1 md:mr-0';
/** Patient/clinician hug the thread edges; AI sits in a narrower center lane (3rd party). */
const AI_GUTTERS = 'mx-3 w-[calc(100%-1.5rem)] md:mx-9 md:w-[calc(100%-4.5rem)]';
const EDGE_BUBBLE_WIDTH = 'max-w-[calc(100%-0.25rem)] md:max-w-[85%]';

/** Clinician reading a patient thread: patient left, AI centered track, clinician right. */
export function clinicianTranscriptBubbleLayout(role: PatientTranscriptRole): ChatBubbleLayout {
  switch (role) {
    case 'clinician':
      return {
        alignEnd: true,
        useUserBubble: true,
        offsetClass: EDGE_RIGHT,
        sizeClass: `${EDGE_BUBBLE_WIDTH} ml-auto`,
        tailClass: 'rounded-br-md',
        showSparkles: false,
        markdown: true,
      };
    case 'patient':
      return {
        alignEnd: false,
        useUserBubble: true,
        offsetClass: EDGE_LEFT,
        sizeClass: `${EDGE_BUBBLE_WIDTH} mr-auto`,
        tailClass: 'rounded-bl-md',
        showSparkles: false,
        markdown: false,
      };
    case 'assistant':
      return {
        alignEnd: false,
        useUserBubble: false,
        offsetClass: '',
        sizeClass: AI_GUTTERS,
        tailClass: 'rounded-bl-md',
        showSparkles: true,
        markdown: true,
      };
  }
}

/** Patient reading their thread: care team + AI inbound on the left; patient outbound on the right. */
export function patientThreadBubbleLayout(
  role: 'user' | 'assistant',
  senderType: ChatMessage['sender_type'],
): ChatBubbleLayout {
  if (role === 'user') {
    return {
      alignEnd: true,
      useUserBubble: true,
      offsetClass: EDGE_RIGHT,
      sizeClass: `${EDGE_BUBBLE_WIDTH} ml-auto`,
      tailClass: 'rounded-br-md',
      showSparkles: false,
      markdown: false,
    };
  }

  if (senderType === 'clinician') {
    return {
      alignEnd: false,
      useUserBubble: false,
      offsetClass: EDGE_LEFT,
      sizeClass: `${EDGE_BUBBLE_WIDTH} mr-auto`,
      tailClass: 'rounded-bl-md',
      showSparkles: false,
      markdown: true,
    };
  }

  return {
    alignEnd: false,
    useUserBubble: false,
    offsetClass: '',
    sizeClass: AI_GUTTERS,
    tailClass: 'rounded-bl-md',
    showSparkles: true,
    markdown: true,
  };
}
