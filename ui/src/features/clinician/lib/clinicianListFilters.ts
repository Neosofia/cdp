import type {
  ClinicianActivityFilter,
  ClinicianEpisodeStatusFilter,
  ClinicianListFilters,
  ClinicianRiskFilter,
} from '@/features/clinician/lib/patientRoster';

export const RISK_FILTER_OPTIONS: { value: ClinicianRiskFilter; label: string }[] = [
  { value: 'all', label: 'All risk' },
  { value: 'high-risk', label: 'High risk' },
  { value: 'medium-risk', label: 'Medium risk' },
];

export const ACTIVITY_FILTER_OPTIONS: { value: ClinicianActivityFilter; label: string }[] = [
  { value: 'all', label: 'All chats' },
  { value: 'active-30m', label: 'Last 30 min' },
  { value: 'chats-today', label: 'Today' },
  { value: 'this-week', label: 'This week' },
];

export const EPISODE_STATUS_FILTER_OPTIONS: { value: ClinicianEpisodeStatusFilter; label: string }[] = [
  { value: 'active', label: 'Open episodes' },
  { value: 'closed', label: 'Closed episodes' },
  { value: 'all', label: 'All episodes' },
];

/** Fixed columns: select · patient · days post-op · last chat · risk (+ edit action). */
export const PATIENT_ROW_GRID_COLS =
  'grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_7rem_5.5rem_2rem]';
export const PATIENT_ROW_GRID_NO_SELECT_COLS =
  'grid-cols-[minmax(0,1fr)_4.5rem_7rem_5.5rem_2rem]';

export function countActiveListFilters(filters: ClinicianListFilters): number {
  let count = 0;
  if (filters.episodeStatus !== 'active') count += 1;
  if (filters.risk !== 'all') count += 1;
  if (filters.activity !== 'all') count += 1;
  if (filters.minDaysPostOp !== null) count += 1;
  if (filters.minDaysSinceChat !== null) count += 1;
  return count;
}

export function patientListEmptyMessage(
  rosterCount: number,
  debouncedSearch: string,
  listFilters: ClinicianListFilters,
): string {
  if (debouncedSearch.trim()) {
    return 'No patients match your search.';
  }
  if (
    listFilters.risk !== 'all'
    || listFilters.activity !== 'all'
    || listFilters.episodeStatus !== 'active'
    || listFilters.minDaysPostOp !== null
    || listFilters.minDaysSinceChat !== null
  ) {
    return 'No patients match these filters. Clear filters to see more.';
  }
  if (rosterCount === 0) {
    return 'No patients on your roster yet. Select Enroll to start post-care monitoring.';
  }
  return 'No patients to show.';
}
