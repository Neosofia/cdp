export type RecordType = 'Lab' | 'Visit' | 'Rx' | 'Imaging' | 'Procedure' | 'Allergy';

export type RecordImageKey = 'xray-scissors';

export interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  type: RecordType;
  provider: string;
  summary: string;
  /** Bundled demo imaging component key */
  imageKey?: RecordImageKey;
}

export const ALL_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: 'rec-001',
    title: 'Lab Results — Complete Metabolic Panel',
    date: '2026-06-22',
    type: 'Lab',
    provider: 'Dr. Sarah Chen',
    summary: 'Glucose 98 mg/dL, creatinine 0.9 mg/dL, eGFR >60. All values within reference range.',
  },
  {
    id: 'rec-002',
    title: 'Visit Summary — Primary Care Follow-up',
    date: '2026-06-15',
    type: 'Visit',
    provider: 'Dr. Sarah Chen',
    summary: 'Routine post-discharge follow-up. Blood pressure 128/82. Continue current medications.',
  },
  {
    id: 'rec-003',
    title: 'Prescription — Metformin 500 mg',
    date: '2026-06-15',
    type: 'Rx',
    provider: 'Dr. Sarah Chen',
    summary: 'Metformin 500 mg PO twice daily with meals. Refills: 3.',
  },
  {
    id: 'rec-004',
    title: 'Imaging — Chest X-Ray',
    date: '2026-05-31',
    type: 'Imaging',
    provider: 'Dr. Marcus Webb',
    summary: 'No acute cardiopulmonary process. Heart size normal.',
  },
  {
    id: 'rec-005',
    title: 'Lab Results — HbA1c',
    date: '2026-05-28',
    type: 'Lab',
    provider: 'Dr. Priya Nair',
    summary: 'HbA1c 6.4%. Discussed lifestyle modifications and medication adherence.',
  },
  {
    id: 'rec-006',
    title: 'Allergy — Penicillin',
    date: '2026-05-10',
    type: 'Allergy',
    provider: 'Dr. Sarah Chen',
    summary: 'Documented reaction: rash (2019). Avoid penicillin-class antibiotics.',
  },
  {
    id: 'rec-007',
    title: 'Procedure — Laparoscopic Cholecystectomy',
    date: '2026-05-01',
    type: 'Procedure',
    provider: 'Dr. Jordan Lee',
    summary: 'Elective cholecystectomy without complications. Discharge instructions provided.',
  },
  {
    id: 'rec-008',
    title: 'Prescription — Lisinopril 10 mg',
    date: '2026-04-20',
    type: 'Rx',
    provider: 'Dr. Marcus Webb',
    summary: 'Lisinopril 10 mg PO once daily. Monitor blood pressure at home.',
  },
  {
    id: 'rec-009',
    title: 'Visit Summary — Cardiology Consult',
    date: '2026-04-12',
    type: 'Visit',
    provider: 'Dr. Marcus Webb',
    summary: 'Evaluated for exertional chest discomfort. ECG normal. Stress test scheduled.',
  },
  {
    id: 'rec-010',
    title: 'Imaging — Abdominal Ultrasound',
    date: '2026-04-05',
    type: 'Imaging',
    provider: 'Dr. Jordan Lee',
    summary: 'Gallstones present. No biliary dilation. Correlated with surgical plan.',
  },
  {
    id: 'rec-xray-2847',
    title: 'Imaging — AP Abdomen (Urgent Care)',
    date: '2026-06-24',
    type: 'Imaging',
    provider: 'Urgent Care — Bayview',
    summary: 'RUQ opacity consistent with retained surgical instrument. Surgeon notified.',
    imageKey: 'xray-scissors',
  },
  {
    id: 'rec-hernia-2912',
    title: 'Procedure — Inguinal hernia repair',
    date: '2026-06-22',
    type: 'Procedure',
    provider: 'Dr. Sarah Chen',
    summary: 'Mesh repair without complication. Discharged same day.',
  },
  {
    id: 'rec-knee-2763',
    title: 'Procedure — Partial meniscectomy',
    date: '2026-06-18',
    type: 'Procedure',
    provider: 'Dr. Priya Nair',
    summary: 'Arthroscopic partial medial meniscectomy. Weight-bearing as tolerated.',
  },
  {
    id: 'rec-append-3001',
    title: 'Procedure — Appendectomy',
    date: '2026-06-23',
    type: 'Procedure',
    provider: 'Dr. Jordan Lee',
    summary: 'Laparoscopic appendectomy. Wound care instructions provided.',
  },
];

const RECORDS_BY_PATIENT: Record<string, string[]> = {
  'PAT-2847': ['rec-xray-2847', 'rec-007', 'rec-001', 'rec-002', 'rec-003', 'rec-010', 'rec-006'],
  'PAT-2912': ['rec-hernia-2912', 'rec-002', 'rec-006'],
  'PAT-2763': ['rec-knee-2763', 'rec-005', 'rec-004'],
  'PAT-3001': ['rec-append-3001', 'rec-001', 'rec-006'],
};

export function recordsForPatient(patientId: string): MedicalRecord[] {
  const ids = RECORDS_BY_PATIENT[patientId];
  if (!ids) return [];
  const byId = new Map(ALL_MEDICAL_RECORDS.map(r => [r.id, r]));
  return ids.map(id => byId.get(id)).filter((r): r is MedicalRecord => Boolean(r));
}

const SELF_RECORD_IDS = [
  'rec-001', 'rec-002', 'rec-003', 'rec-004', 'rec-005',
  'rec-006', 'rec-007', 'rec-008', 'rec-009', 'rec-010',
];

/** Records shown on the patient self-service review page */
export function recordsForSelf(): MedicalRecord[] {
  const byId = new Map(ALL_MEDICAL_RECORDS.map(r => [r.id, r]));
  return SELF_RECORD_IDS.map(id => byId.get(id)).filter((r): r is MedicalRecord => Boolean(r));
}
