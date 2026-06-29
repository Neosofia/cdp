import type { ChatDisplayRole } from '@/shared/chat/chatApi';

export type ChatThreadView = 'patient' | 'clinician';

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

const patientOutbound = (): ChatBubbleLayout => ({
  alignEnd: true,
  useUserBubble: true,
  offsetClass: EDGE_RIGHT,
  sizeClass: `${EDGE_BUBBLE_WIDTH} ml-auto`,
  tailClass: 'rounded-br-md',
  showSparkles: false,
  markdown: false,
});

const inboundUserBubble = (): ChatBubbleLayout => ({
  alignEnd: false,
  useUserBubble: true,
  offsetClass: EDGE_LEFT,
  sizeClass: `${EDGE_BUBBLE_WIDTH} mr-auto`,
  tailClass: 'rounded-bl-md',
  showSparkles: false,
  markdown: false,
});

const clinicianOutbound = (): ChatBubbleLayout => ({
  alignEnd: true,
  useUserBubble: true,
  offsetClass: EDGE_RIGHT,
  sizeClass: `${EDGE_BUBBLE_WIDTH} ml-auto`,
  tailClass: 'rounded-br-md',
  showSparkles: false,
  markdown: true,
});

const careTeamInbound = (): ChatBubbleLayout => ({
  alignEnd: false,
  useUserBubble: false,
  offsetClass: EDGE_LEFT,
  sizeClass: `${EDGE_BUBBLE_WIDTH} mr-auto`,
  tailClass: 'rounded-bl-md',
  showSparkles: false,
  markdown: true,
});

const assistantInbound = (): ChatBubbleLayout => ({
  alignEnd: false,
  useUserBubble: false,
  offsetClass: '',
  sizeClass: AI_GUTTERS,
  tailClass: 'rounded-bl-md',
  showSparkles: true,
  markdown: true,
});

/** Patient thread: patient outbound right; care team + AI inbound left. Clinician transcript: patient left, AI center, clinician right. */
export function chatDisplayBubbleLayout(view: ChatThreadView, role: ChatDisplayRole): ChatBubbleLayout {
  if (view === 'patient') {
    if (role === 'patient') {
      return patientOutbound();
    }
    if (role === 'clinician') {
      return careTeamInbound();
    }
    return assistantInbound();
  }

  if (role === 'clinician') {
    return clinicianOutbound();
  }
  if (role === 'patient') {
    return inboundUserBubble();
  }
  return assistantInbound();
}
