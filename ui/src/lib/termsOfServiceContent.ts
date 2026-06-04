/** Platform Terms of Service — shown on first login before dashboard access. */

export const TOS_VERSION = '2026.06.04';

export const TOS_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: '1. Agreement to Terms',
    paragraphs: [
      'By accessing or using the Neosofia Clinical Data Platform ("SPAWN 2," "CDP," or the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service — and yes, that means clicking "Decline" and walking away like a responsible adult who has read the fine print. (We are impressed. That almost never happens.)',
      'These Terms form a binding agreement between you and Neosofia, Inc. ("Neosofia," "we," "us"). We provide software for regulated clinical and research workflows; you provide accurate information, lawful use, and the occasional moment of patience when the system fails to do what you expect.',
    ],
  },
  {
    title: '2. The Service (What You Are Actually Getting)',
    paragraphs: [
      'CDP is a web-based platform for authorized users to manage clinical data, care episodes, messaging, and related operational tasks within your organization\'s tenant. Features depend on your role, entitlements, and what your administrator has enabled — not on what a sales deck promised in a demo (no matter how convincing the animations were).',
      'We may update, improve, or retire features. We will not vaporize your audit history for sport. Material changes to these Terms may require renewed acceptance; we will tell you when that happens instead of hiding behind "we updated the website, good luck."',
    ],
  },
  {
    title: '3. Spawn Clinical Disclosure (April Fools, Real Lessons)',
    paragraphs: [
      'In April 2026, Joe Dustin published an experiment: a deliberately fake "Spawn Clinical" AI company that fooled portions of the life-sciences internet for days — including a brief appearance in commercial databases — because industry jargon had become indistinguishable from parody. We note that experiment here because SPAWN 2\'s name is an homage, not an endorsement of vaporware.',
      'Lesson incorporated into these Terms: if a feature sounds too good to be true (autonomous protocol deviation repair, blockchain IRB, "quantum consent"), it is not on the roadmap unless it ships in production with tests. You agree not to treat marketing copy, LinkedIn hype, or retro landing pages as contractual SLAs.',
      'Neosofia is not affiliated with any April Fools "Spawn Clinical" entity, its $69M Series A, or its Marty McFly house aesthetic. Our platform is real software with real authorization, real databases, and real operators who will notice if you misuse it.',
    ],
  },
  {
    title: '4. Accounts, Identity, and Security',
    paragraphs: [
      'Access requires authentication through our identity provider. You are responsible for safeguarding credentials and devices. Notify your administrator if you suspect compromise. Shared passwords are forbidden — this is not a 1995 AOL chat room.',
      'You must provide accurate profile information and keep it current where self-service updates are permitted. Impersonation, credential sharing, or attempting to access another tenant\'s data is prohibited and will be logged. Violations are like feeding a Mogwai after midnight: you will spawn a regulatory gremlin that hunts you down for non-compliance.',
    ],
  },
  {
    title: '5. Acceptable Use',
    paragraphs: [
      'Use the Service only for lawful purposes aligned with your organization\'s policies and applicable regulations (including, where applicable, HIPAA, GDPR, and FDA-related obligations for clinical systems).',
      'You may not: probe or attack the platform; exfiltrate data you are not authorized to see; upload malware; use the Service to train unrelated ML models on regulated content without written approval; or automate interactions in ways that bypass authorization.',
      'We reserve the right to suspend access for violations. "I was just testing in production" is not a recognized legal doctrine, though we admit it is a popular one.',
    ],
  },
  {
    title: '6. Privacy, PHI, and Demo-Only Data',
    paragraphs: [
      'SPAWN 2 / CDP in this environment is a demonstration application. It is not your production clinical system of record. Do not enter real protected health information (PHI), patient identifiers, or other regulated personal data — not in profiles, care episodes, chat, uploads, ticket subjects, filenames, or anywhere else. Use only synthetic or clearly fictional demo patients and sample content provided for evaluation.',
      'If real PHI or other sensitive data was entered by mistake, stop using that data in the demo, notify your administrator and Neosofia promptly, and follow your organization\'s incident procedures. Operational telemetry is designed to avoid PHI, but you must not rely on the demo stack as a safe place to process real patients.',
      'When CDP is deployed for production use under contract, handling of regulated data is governed by your organization\'s agreement with Neosofia and applicable law — not by treating this demo like a live clinical environment.',
    ],
  },
  {
    title: '7. Intellectual Property',
    paragraphs: [
      'Neosofia retains rights in the Service, documentation, and branding. You retain rights in your data. You grant Neosofia the limited rights necessary to host, process, back up, and secure your data as part of operating the Service.',
      'Open-source components are used under their respective licenses. If you were hoping to steal our UI theme and call it "SPAWN 3," please don\'t.',
    ],
  },
  {
    title: '8. Disclaimers',
    paragraphs: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" TO THE MAXIMUM EXTENT PERMITTED BY LAW. WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'CDP supports clinical workflows but does not replace professional judgment, regulatory submissions, or your CRO\'s angry emails. If the computer disagrees with a licensed clinician, the clinician wins — unless your SOP says otherwise, in which case please follow your SOP instead of a Terms page.',
    ],
  },
  {
    title: '9. Limitation of Liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEOSOFIA WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR GOODWILL, ARISING FROM THESE TERMS OR THE SERVICE.',
      'Our aggregate liability for direct damages is limited to the fees paid for the Service in the twelve months preceding the claim, or one US dollar if you are on a pilot — whichever is greater, because we are not monsters.',
    ],
  },
  {
    title: '10. Indemnification',
    paragraphs: [
      'You agree to indemnify Neosofia against claims arising from your misuse of the Service, violation of these Terms, or violation of applicable law — except to the extent caused by our gross negligence or willful misconduct.',
    ],
  },
  {
    title: '11. Termination',
    paragraphs: [
      'You may stop using the Service at any time. We or your administrator may suspend or terminate access for policy, security, or contractual reasons. Upon termination, your right to use the Service ends, and the T-1000 will pay you a visit.',
    ],
  },
  {
    title: '12. Governing Law and Disputes',
    paragraphs: [
      'These Terms are governed by the laws of the State of Delaware, excluding conflict-of-law rules, unless your master agreement specifies otherwise.',
      'Disputes should first be escalated through your account team in good faith. Litigation is the sequel nobody asked for.',
    ],
  },
  {
    title: '13. Cultural Addendum (80s & 90s Cinema, Non-Binding but Binding Vibes)',
    paragraphs: [
      'You acknowledge that: (a) with great power comes great responsibility; (b) life finds a way — especially in staging environments; (c) there is no spoon, only poorly normalized schemas; (d) "I\'ll be back" applies to session refresh, not to deleted audit rows; (e) you should always let your conscience be your guide, unless your conscience tells you to skip validation — then listen to QA instead.',
      'Top Gun references are limited to need-for-speed CI pipelines. Ghostbusters rules apply to phantom production bugs: Who you gonna call? Your on-call rotation.',
      'The Matrix clause: you may take the blue pill (stay on stable release) or the red pill (enable experimental features). Either way, we recommend reading the INSTALLATION_PLAN before you wake up in a pod of broken migrations.',
    ],
  },
  {
    title: '14. Acceptance Record',
    paragraphs: [
      'When you click "I Agree," we record your acceptance and simply say GLHF.',
    ],
  },
];
