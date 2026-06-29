export function csvEscape(value: string | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function auditChangeTypeLabel(changeType: number): string {
  if (changeType === 1) return 'created';
  if (changeType === 2) return 'updated';
  if (changeType === 3) return 'deleted';
  return String(changeType);
}

export function auditActorTypeLabel(changedByType: number): string {
  return changedByType === 1 ? 'User' : 'Service';
}

export function auditTimestampUtc(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { timeZone: 'UTC' });
}

export function auditBaseCsvCells(row: {
  changed_at: string;
  change_type: number;
  changed_by_type: number;
  changed_by_uuid: string;
}): string[] {
  return [
    csvEscape(auditTimestampUtc(row.changed_at)),
    csvEscape(auditChangeTypeLabel(row.change_type)),
    csvEscape(auditActorTypeLabel(row.changed_by_type)),
    csvEscape(row.changed_by_uuid),
  ];
}

export function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
