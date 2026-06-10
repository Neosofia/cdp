import type { ServiceAuditItem } from '@/components/AuditHistorySheet';
import { fetchAuthServices, fetchCatalogAudits } from '@/lib/authServicesApi';
import { fetchIdpOperatorOps } from '@/lib/idpFailedAuthFeed';

/** Matches ServiceManagement rotation warning threshold (≥300 days). */
export const CREDENTIAL_ROTATION_WARNING_DAYS = 300;

export const AUDIT_FEED_LIMIT = 6;

export type DashboardAuditLevel = 'info' | 'warning' | 'error';

export type DashboardAuditEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  changedAt: string;
  level: DashboardAuditLevel;
};

export function auditEventLevel(changeType: number): DashboardAuditLevel {
  if (changeType === 3) return 'warning';
  return 'info';
}

export function auditEventAction(
  changeType: number,
  source: 'service' | 'credential',
): string {
  const verb = changeType === 1 ? 'Created' : changeType === 2 ? 'Updated' : 'Deleted';
  return source === 'credential' ? `${verb} credential` : `${verb} service record`;
}

export function auditEventActor(item: ServiceAuditItem): string {
  const name = item.changed_by_name?.trim();
  if (name) return name;
  return item.changed_by_type === 1 ? 'User' : 'Service';
}

export function mapAuditItemToDashboardEvent(
  item: ServiceAuditItem,
  slug: string,
  source: 'service' | 'credential',
): DashboardAuditEvent {
  return {
    id: `${item.history_uuid ?? item.changed_at}-${slug}-${source}`,
    actor: auditEventActor(item),
    action: auditEventAction(item.change_type, source),
    target: slug,
    changedAt: item.changed_at,
    level: auditEventLevel(item.change_type),
  };
}

export function mergeAuditFeedEvents(events: DashboardAuditEvent[]): DashboardAuditEvent[] {
  return [...events]
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    .slice(0, AUDIT_FEED_LIMIT);
}

export function mapPlatformAuditFeedItems(items: ServiceAuditItem[]): DashboardAuditEvent[] {
  return items.map((item) =>
    mapAuditItemToDashboardEvent(item, item.slug ?? 'unknown', item.source ?? 'service'),
  );
}

export function countRotationDueCredentials(
  services: { days_since_rotation: number | null }[],
  thresholdDays = CREDENTIAL_ROTATION_WARNING_DAYS,
): number {
  return services.filter(
    (service) =>
      service.days_since_rotation !== null &&
      service.days_since_rotation >= thresholdDays,
  ).length;
}

export async function fetchPlatformOperatorOps(
  token: string,
  activeActor: string,
): Promise<{ rotationDueCount: number; events: DashboardAuditEvent[] }> {
  const [audits, services] = await Promise.all([
    fetchCatalogAudits(token, activeActor, 50),
    fetchAuthServices(token, activeActor),
  ]);
  return {
    rotationDueCount: countRotationDueCredentials(services.items),
    events: mapPlatformAuditFeedItems(audits.items),
  };
}

export async function fetchOperatorAuditFeed(
  token: string,
  activeActor: string,
): Promise<DashboardAuditEvent[]> {
  const [platformOps, idpOps] = await Promise.all([
    fetchPlatformOperatorOps(token, activeActor),
    fetchIdpOperatorOps(token, activeActor),
  ]);
  return mergeAuditFeedEvents([...platformOps.events, ...idpOps.events]);
}
