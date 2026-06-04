import type { ServiceAuditItem } from '@/components/AuditHistorySheet';
import {
  fetchAuthServiceAudits,
  fetchAuthServices,
  type AuthServiceItem,
} from '@/lib/authServicesApi';
import { fetchIdpFailedAuthAuditEvents } from '@/lib/idpFailedAuthFeed';

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

export function countCredentialsDueForRotation(services: AuthServiceItem[]): number {
  return services.filter(
    (svc) =>
      svc.days_since_rotation !== null &&
      svc.days_since_rotation >= CREDENTIAL_ROTATION_WARNING_DAYS,
  ).length;
}

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

export async function collectPlatformAuditEvents(
  token: string,
  activeActor: string,
): Promise<DashboardAuditEvent[]> {
  const { items: services } = await fetchAuthServices(token, activeActor, 1, 100);
  const perSourcePageSize = 5;
  const batches = await Promise.all(
    services.flatMap((svc) => [
      fetchAuthServiceAudits(token, activeActor, svc.slug, 'service', 1, perSourcePageSize).then(
        (res) => ({ slug: svc.slug, source: 'service' as const, items: res.items }),
      ),
      fetchAuthServiceAudits(token, activeActor, svc.slug, 'credential', 1, perSourcePageSize).then(
        (res) => ({ slug: svc.slug, source: 'credential' as const, items: res.items }),
      ),
    ]),
  );

  return batches.flatMap(({ slug, source, items }) =>
    items.map((item) => mapAuditItemToDashboardEvent(item, slug, source)),
  );
}

export async function fetchPlatformAuditFeed(
  token: string,
  activeActor: string,
): Promise<DashboardAuditEvent[]> {
  return mergeAuditFeedEvents(await collectPlatformAuditEvents(token, activeActor));
}

export async function fetchOperatorAuditFeed(
  token: string,
  activeActor: string,
): Promise<DashboardAuditEvent[]> {
  const [platformEvents, failedSignIns] = await Promise.all([
    collectPlatformAuditEvents(token, activeActor),
    fetchIdpFailedAuthAuditEvents(token, activeActor),
  ]);
  return mergeAuditFeedEvents([...platformEvents, ...failedSignIns]);
}
