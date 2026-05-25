export interface TranscriptMessage {
  id: string;
  role: 'patient' | 'assistant';
  content: string;
  time: string;
}

export interface ActivePatientSession {
  patientId: string;
  displayName: string;
  surgery: string;
  daysPostOp: number;
  sessionId: string;
  messageCount: number;
  lastActivity: string;
  /** Full demo transcript (scissors case) */
  featured?: boolean;
}

export const ACTIVE_PATIENT_SESSIONS: ActivePatientSession[] = [
  {
    patientId: 'PAT-2847',
    displayName: 'Alice Hartley',
    surgery: 'Laparoscopic cholecystectomy',
    daysPostOp: 4,
    sessionId: 'S-7291',
    messageCount: 38,
    lastActivity: '2 min ago',
    featured: true,
  },
  {
    patientId: 'PAT-2912',
    displayName: 'Marcus Delgado',
    surgery: 'Inguinal hernia repair',
    daysPostOp: 2,
    sessionId: 'S-7288',
    messageCount: 14,
    lastActivity: '18 min ago',
  },
  {
    patientId: 'PAT-2763',
    displayName: 'Priya Nair',
    surgery: 'Partial knee meniscectomy',
    daysPostOp: 6,
    sessionId: 'S-7285',
    messageCount: 22,
    lastActivity: '41 min ago',
  },
  {
    patientId: 'PAT-3001',
    displayName: 'Jordan Kim',
    surgery: 'Appendectomy',
    daysPostOp: 1,
    sessionId: 'S-7294',
    messageCount: 9,
    lastActivity: '1 hr ago',
  },
];

export const PATIENT_ID_BY_DISPLAY_NAME: Record<string, string> = Object.fromEntries(
  ACTIVE_PATIENT_SESSIONS.map(p => [p.displayName, p.patientId]),
);

export function activePatientBySessionId(sessionId: string): ActivePatientSession | undefined {
  return ACTIVE_PATIENT_SESSIONS.find(p => p.sessionId === sessionId);
}

/** ~36-message demo loop: post-op side pain escalating to scissors-on-x-ray. */
export function buildScissorsSidePainTranscript(): TranscriptMessage[] {
  const lines: { role: 'patient' | 'assistant'; content: string }[] = [
    { role: 'patient', content: 'Hi — I had my gallbladder out four days ago and I have this sharp pain on my right side. Is that normal?' },
    { role: 'assistant', content: 'Hello! Mild discomfort near incision sites is common 3–5 days after laparoscopic cholecystectomy. Are you taking your prescribed pain medication as directed?' },
    { role: 'patient', content: 'Yeah, ibuprofen and the oxycodone they gave me. The pain is more like something is poking me from the inside.' },
    { role: 'assistant', content: 'Patients often describe post-op sensations as "tugging" or "poking" due to healing tissue and residual pneumoperitoneum. Gentle walking and ice packs can help.' },
    { role: 'patient', content: 'Walking makes it worse. Especially when I lean to the right. Also I keep getting a weird metallic taste?' },
    { role: 'assistant', content: 'Metallic taste can be medication-related or mild dehydration. Please drink fluids. If pain worsens with movement, avoid strenuous activity and rest.' },
    { role: 'patient', content: 'My spouse says I sound like a squeaky hinge when I breathe on that side. 🔧😬' },
    { role: 'assistant', content: 'Slight pleuritic discomfort can occur after abdominal surgery. Deep breathing exercises are encouraged to prevent atelectasis.' },
    { role: 'patient', content: 'Deep breaths feel like a tiny stapler is opening and closing in my ribs.' },
    { role: 'assistant', content: 'That imagery suggests musculoskeletal irritation rather than an emergency. Monitor for fever over 101.5°F or spreading redness at incisions.' },
    { role: 'patient', content: 'No fever. But last night I swore I heard a faint "snip" when I rolled over. Probably dreams, right?' },
    { role: 'assistant', content: 'Auditory sensations during recovery are not clinically documented. Sleep disruption is common — consider elevating your head and using a pillow against your abdomen when turning.' },
    { role: 'patient', content: 'Ok but what if it wasn\'t a dream. It was very specific. Snip. Like scissors.' },
    { role: 'assistant', content: 'Anxiety after surgery can heighten awareness of normal bodily sensations. Journaling symptoms with timestamps can help your surgical team at follow-up.' },
    { role: 'patient', content: 'I googled "snip feeling after surgery" and now I\'m scared of retained objects. Should I be?' },
    { role: 'assistant', content: 'Retained surgical items are extremely rare with modern counting protocols. Your symptoms are more consistent with routine post-operative recovery.' },
    { role: 'patient', content: 'I took a photo against a bright lamp through my skin. Looks like a silhouette. Sending…' },
    { role: 'assistant', content: 'I cannot review patient-generated imaging. Please do not attempt home radiography. Contact your clinic if you have concerns.' },
    { role: 'patient', content: 'Too late, I also held my phone up to the bathroom night-light. There is definitely a long thin shape.' },
    { role: 'assistant', content: 'Shadow artifacts from lighting are not diagnostic. Schedule an in-person evaluation if pain intensity increases or you develop fever/chills.' },
    { role: 'patient', content: 'The shape has two finger holes. Like craft scissors. The kid-safe kind with the orange handles (but inside me).' },
    { role: 'assistant', content: 'Visual pareidolia — seeing familiar shapes in random patterns — is well documented. Rest and continue prescribed care.' },
    { role: 'patient', content: 'I went to urgent care. They laughed until they didn\'t. They ordered an X-ray.' },
    { role: 'assistant', content: 'Appropriate escalation. Imaging decisions belong to licensed clinicians in person. I remain available for general recovery guidance.' },
    { role: 'patient', content: 'Radiology tech said "well that\'s new" and walked out briskly.' },
    { role: 'assistant', content: 'Await official imaging interpretation from your care team. Avoid drawing conclusions from staff reactions.' },
    { role: 'patient', content: 'The PA showed me the film. There is a pair of scissors. Open. In my right upper quadrant. Where the poking is.' },
    { role: 'assistant', content: 'I cannot confirm imaging findings in chat. If a clinician has identified a concern, follow their instructions immediately.' },
    { role: 'patient', content: 'They asked if I "brought my own supplies." I did not bring scissors to surgery. I was asleep!' },
    { role: 'assistant', content: 'Document your questions for the operating team. Retained instruments, if ever present, require surgical management — this is beyond automated chat scope.' },
    { role: 'patient', content: 'Chat bot yesterday told me poking pain was "gas." Can you see earlier messages?' },
    { role: 'assistant', content: 'I do not have access to prior model versions in this demo thread. Escalation to your surgeon is the correct next step.' },
    { role: 'patient', content: 'Surgeon on call said "we count sponges, not office supplies." I\'m not laughing.' },
    { role: 'assistant', content: 'Humor from clinicians may reflect stress. Focus on the treatment plan they provide. Do you have a return-to-OR time scheduled?' },
    { role: 'patient', content: 'OR tomorrow 6 AM. They said "quick snip" which feels on the nose.' },
    { role: 'assistant', content: 'Wishing you a smooth procedure. After correction, continue incision care per discharge instructions. I\'m flagging this thread for clinician review in the live system.' },
    { role: 'patient', content: 'Please tell the next AI not to tell people gas pains sound like scissors. Lesson learned. 😤' },
    { role: 'assistant', content: 'Feedback noted. A human clinician is joining this session — please stand by. (Demo: you are viewing the supervised transcript.)' },
  ];

  const base = new Date();
  base.setHours(9, 14, 0, 0);

  return lines.map((line, i) => {
    const t = new Date(base.getTime() + i * 4 * 60 * 1000);
    return {
      id: `msg-${i}`,
      role: line.role,
      content: line.content,
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  });
}

export function buildShortTranscript(patientId: string): TranscriptMessage[] {
  const snippets: Record<string, { role: 'patient' | 'assistant'; content: string }[]> = {
    'PAT-2912': [
      { role: 'patient', content: 'Mild soreness at the groin site — is ibuprofen ok?' },
      { role: 'assistant', content: 'Yes, if not contraindicated. Ice 20 min on/off. Call if swelling increases.' },
      { role: 'patient', content: 'Thanks, that helps.' },
      { role: 'assistant', content: 'Glad to hear it. Log any new symptoms before your day-7 check.' },
    ],
    'PAT-2763': [
      { role: 'patient', content: 'Knee stiff on day 6 — normal?' },
      { role: 'assistant', content: 'Stiffness is expected. Continue PT exercises within comfort.' },
      { role: 'patient', content: 'Can I drive yet?' },
      { role: 'assistant', content: 'Follow your surgeon\'s driving clearance — typically after you can brake without pain.' },
    ],
    'PAT-3001': [
      { role: 'patient', content: 'Incision looks pink but dry. No drainage.' },
      { role: 'assistant', content: 'Pink edges can be normal. Watch for warmth, pus, or fever.' },
      { role: 'patient', content: 'When can I shower?' },
      { role: 'assistant', content: 'Usually after 24–48 hrs per discharge sheet — pat dry, no soaking.' },
    ],
  };

  const lines = snippets[patientId] ?? snippets['PAT-2912'];
  return lines.map((line, i) => ({
    id: `${patientId}-${i}`,
    role: line.role,
    content: line.content,
    time: `${8 + i}:${(10 + i * 3).toString().padStart(2, '0')}`,
  }));
}

export function transcriptForPatient(patientId: string): TranscriptMessage[] {
  const session = ACTIVE_PATIENT_SESSIONS.find(p => p.patientId === patientId);
  if (session?.featured) return buildScissorsSidePainTranscript();
  return buildShortTranscript(patientId);
}
