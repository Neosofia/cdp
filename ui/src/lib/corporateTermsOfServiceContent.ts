/** Corporate Terms of Service — formal review copy for light mode acceptance flow. */

export const CORPORATE_TOS_VERSION = '2026.06.04';

export const CORPORATE_TOS_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: '1. Agreement to Terms',
    paragraphs: [
      'By accessing or using the Post Discharge Care Platform (the "Platform" or "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Service.',
      'These Terms form a binding agreement between you and Neosofia, Inc. ("Neosofia," "we," or "us"). Neosofia provides software for regulated clinical and post-discharge care workflows. You agree to provide accurate information, lawful use, and compliance with your organization\'s policies.',
    ],
  },
  {
    title: '2. Description of the Service',
    paragraphs: [
      'The Platform is a web-based application for authorized users to manage clinical data, care episodes, messaging, and related operational tasks within your organization\'s tenant. Available features depend on your assigned role, entitlements, and administrator configuration.',
      'We may update, improve, or retire features from time to time. Material changes to these Terms may require renewed acceptance. We will notify you when renewed acceptance is required.',
    ],
  },
  {
    title: '3. Accounts, Identity, and Security',
    paragraphs: [
      'Access requires authentication through our identity provider. You are responsible for safeguarding credentials and devices. Notify your administrator promptly if you suspect unauthorized access.',
      'You must provide accurate profile information and keep it current where self-service updates are permitted. Impersonation, credential sharing, and attempts to access another tenant\'s data are prohibited.',
    ],
  },
  {
    title: '4. Acceptable Use',
    paragraphs: [
      'Use the Service only for lawful purposes aligned with your organization\'s policies and applicable regulations, including where applicable HIPAA, GDPR, and FDA-related obligations for clinical systems.',
      'You may not probe or attack the platform, exfiltrate unauthorized data, upload malware, use the Service to train unrelated machine learning models on regulated content without written approval, or automate interactions that bypass authorization controls.',
      'We reserve the right to suspend access for violations of these Terms or applicable law.',
    ],
  },
  {
    title: '5. Privacy, PHI, and Demonstration Environments',
    paragraphs: [
      'When the Platform is operated as a demonstration environment, it is not a production clinical system of record. Do not enter real protected health information (PHI), patient identifiers, or other regulated personal data. Use only synthetic or clearly fictional demo content provided for evaluation.',
      'If regulated data is entered by mistake, stop using that data, notify your administrator and Neosofia promptly, and follow your organization\'s incident response procedures.',
      'When the Platform is deployed for production use under contract, handling of regulated data is governed by your organization\'s agreement with Neosofia and applicable law.',
    ],
  },
  {
    title: '6. Intellectual Property',
    paragraphs: [
      'Neosofia retains rights in the Service, documentation, and branding. You retain rights in your data. You grant Neosofia the limited rights necessary to host, process, back up, and secure your data as part of operating the Service.',
      'Open-source components are used under their respective licenses.',
    ],
  },
  {
    title: '7. Disclaimers',
    paragraphs: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" TO THE MAXIMUM EXTENT PERMITTED BY LAW. WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'The Platform supports clinical workflows but does not replace professional judgment, regulatory submissions, or institutional policies. Licensed clinicians and authorized operators remain responsible for clinical decisions.',
    ],
  },
  {
    title: '8. Limitation of Liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEOSOFIA WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR GOODWILL, ARISING FROM THESE TERMS OR THE SERVICE.',
      'Our aggregate liability for direct damages is limited to the fees paid for the Service in the twelve months preceding the claim, or one U.S. dollar if you are on a pilot program, whichever is greater.',
    ],
  },
  {
    title: '9. Indemnification',
    paragraphs: [
      'You agree to indemnify Neosofia against claims arising from your misuse of the Service, violation of these Terms, or violation of applicable law, except to the extent caused by our gross negligence or willful misconduct.',
    ],
  },
  {
    title: '10. Termination',
    paragraphs: [
      'You may stop using the Service at any time. We or your administrator may suspend or terminate access for policy, security, or contractual reasons. Upon termination, your right to use the Service ends.',
    ],
  },
  {
    title: '11. Governing Law and Disputes',
    paragraphs: [
      'These Terms are governed by the laws of the State of Delaware, excluding conflict-of-law rules, unless your master agreement specifies otherwise.',
      'Disputes should first be escalated through your account team in good faith before formal legal proceedings.',
    ],
  },
  {
    title: '12. Acceptance Record',
    paragraphs: [
      'When you select "I Agree," we record your acceptance of these Terms, including the version identifier shown on this page, on your user profile.',
    ],
  },
];
