export type PatientRiskLevel = 'High' | 'Medium' | 'Low';

export interface DemoPatientClinical {
  surgery: string;
  procedureDate: string;
  daysPostOp: number;
  recoveryId: string;
  riskLevel: PatientRiskLevel;
}

export interface RegistryPatientUser {
  uuid: string;
  tenant_uuid: string;
  display_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
}

export type CareEpisodeStatus = 'active' | 'closed';

/** Platform default post-discharge monitoring window (spec 015 FR-003). */
export const DEFAULT_CARE_WINDOW_DAYS = 30;

export interface ActivePatientRecovery {
  patientUuid: string;
  displayCode: string;
  displayName: string;
  surgery: string;
  procedureDate: string;
  daysPostOp: number;
  recoveryId: string;
  /** ISO timestamp of the latest chat message, from the chat service. */
  lastChatAt: string | null;
  riskLevel: PatientRiskLevel;
  /** Rolling clinical risk summary from the care-episode risk agent, when available. */
  riskSummary?: string | null;
  episodeStatus: CareEpisodeStatus;
  tenantUuid?: string | null;
  tenantName?: string | null;
  /** Post-discharge monitoring window length in days (spec 015). */
  careWindowDays: number;
}

export type ClinicianEpisodeStatusFilter = 'active' | 'closed' | 'all';
export type ClinicianRiskFilter = 'all' | 'high-risk' | 'medium-risk';
export type ClinicianActivityFilter = 'all' | 'active-30m' | 'chats-today' | 'this-week';

export interface ClinicianListFilters {
  risk: ClinicianRiskFilter;
  activity: ClinicianActivityFilter;
  episodeStatus: ClinicianEpisodeStatusFilter;
  minDaysPostOp: number | null;
  minDaysSinceChat: number | null;
}

export const DEFAULT_CLINICIAN_LIST_FILTERS: ClinicianListFilters = {
  risk: 'all',
  activity: 'all',
  episodeStatus: 'active',
  minDaysPostOp: null,
  minDaysSinceChat: null,
};

/** Live / in-session chat activity (right panel, cyan pod). */
export const CHAT_ACTIVE_WINDOW_MS = 30 * 60 * 1000;

/** Chats today pod and filtered patient list from purple stat card. */
export const CHAT_TODAY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const CHAT_WEEK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const PATIENT_LIST_PAGE_SIZE = 8;
