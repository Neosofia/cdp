export type RecordType = 'Lab' | 'Visit' | 'Rx' | 'Imaging' | 'Procedure' | 'Allergy';

export type RecordImageKey = 'xray-scissors';

export interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  type: RecordType;
  provider: string;
  summary: string;
  imageKey?: RecordImageKey;
}
