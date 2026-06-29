import type { DashboardBadgeColor } from '@/shared/dashboard/Dashboard';

export type RecordBadgeColor = DashboardBadgeColor;

export const RECORD_TYPE_COLOR: Record<string, RecordBadgeColor> = {
  Lab: 'cyan',
  Visit: 'purple',
  Rx: 'green',
  Imaging: 'yellow',
  Procedure: 'red',
  Allergy: 'cyan',
};

export function appointmentStatusColor(status: string): DashboardBadgeColor {
  const key = status.toLowerCase();
  if (key === 'confirmed') return 'green';
  if (key === 'pending') return 'yellow';
  if (key === 'cancelled') return 'red';
  return 'cyan';
}

export function formatAppointmentWhen(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRecordDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function daysUntil(iso: string, nowMs: number): number | null {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.ceil((ts - nowMs) / (24 * 60 * 60 * 1000)));
}

export function previewText(body: string, max = 72): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
