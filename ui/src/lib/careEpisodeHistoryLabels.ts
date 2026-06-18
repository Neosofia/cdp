import type { CareEpisodeHistoryEntry } from '@/lib/careEpisodeApi';

function formatHistoryClosedAt(value: string | null | undefined): string {
  if (!value) return 'discharged';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'discharged';
  return new Date(parsed).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function careEpisodeHistoryPrimaryLabel(entry: CareEpisodeHistoryEntry): string {
  if (entry.is_current && entry.status === 'active') {
    return `Current — ${entry.surgery}`;
  }
  if (entry.is_current && entry.status === 'closed') {
    return `Last discharge — ${entry.surgery}`;
  }
  return entry.surgery;
}

export function careEpisodeHistorySecondaryLabel(entry: CareEpisodeHistoryEntry): string {
  if (entry.is_current && entry.status === 'active') {
    return entry.procedure_date;
  }
  if (entry.is_current && entry.status === 'closed') {
    return formatHistoryClosedAt(entry.closed_at);
  }
  return `${entry.procedure_date} · ${formatHistoryClosedAt(entry.closed_at)}`;
}

/** Single-line label for desktop selects and accessibility. */
export function careEpisodeHistoryOptionLabel(entry: CareEpisodeHistoryEntry): string {
  return `${careEpisodeHistoryPrimaryLabel(entry)} · ${careEpisodeHistorySecondaryLabel(entry)}`;
}
