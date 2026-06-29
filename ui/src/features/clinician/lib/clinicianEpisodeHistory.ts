export { formatHistoryClosedAt } from '@/shared/care-episode/careEpisodeHistoryLabels';

export function historyRiskLevel(level: string): 'High' | 'Medium' | 'Low' {
  const normalized = level.trim().toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'medium') return 'Medium';
  return 'Low';
}

export function daysPostOpFromProcedureDate(procedureDate: string): number {
  const procedureMs = Date.parse(`${procedureDate.trim()}T12:00:00`);
  if (!Number.isFinite(procedureMs)) {
    return 0;
  }
  const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T12:00:00`);
  return Math.max(0, Math.floor((todayMs - procedureMs) / (24 * 60 * 60 * 1000)));
}
