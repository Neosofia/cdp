import { describe, expect, it } from 'vitest';
import type { ServiceAuditItem } from '@/components/AuditHistorySheet';
import {
  auditEventAction,
  auditEventLevel,
  countCredentialsDueForRotation,
  CREDENTIAL_ROTATION_WARNING_DAYS,
  mapAuditItemToDashboardEvent,
  mergeAuditFeedEvents,
} from '@/lib/platformAuditFeed';
import type { AuthServiceItem } from '@/lib/authServicesApi';

function sampleAudit(partial: Partial<ServiceAuditItem> = {}): ServiceAuditItem {
  return {
    history_uuid: 'hist-1',
    changed_at: '2026-06-04T10:00:00Z',
    changed_by_uuid: 'actor-1',
    changed_by_type: 1,
    change_type: 2,
    source: 'credential',
    credential_uuid: 'cred-1',
    name: null,
    slug: 'user',
    base_url: null,
    changed_by_name: 'ops@example.com',
    ...partial,
  };
}

describe('platformAuditFeed', () => {
  it('counts services at or past rotation warning threshold', () => {
    const services: AuthServiceItem[] = [
      {
        uuid: '1',
        name: 'A',
        slug: 'a',
        base_url: 'http://a',
        credential_uuid: 'c',
        credential_changed_at: null,
        days_since_rotation: CREDENTIAL_ROTATION_WARNING_DAYS,
      },
      {
        uuid: '2',
        name: 'B',
        slug: 'b',
        base_url: 'http://b',
        credential_uuid: 'd',
        credential_changed_at: null,
        days_since_rotation: 10,
      },
    ];
    expect(countCredentialsDueForRotation(services)).toBe(1);
  });

  it('maps audit rows to dashboard events', () => {
    const event = mapAuditItemToDashboardEvent(sampleAudit(), 'authentication', 'credential');
    expect(event.actor).toBe('ops@example.com');
    expect(event.action).toBe('Updated credential');
    expect(event.target).toBe('authentication');
    expect(event.level).toBe('info');
  });

  it('marks deletions as warning level', () => {
    expect(auditEventLevel(3)).toBe('warning');
    expect(auditEventAction(3, 'service')).toBe('Deleted service record');
  });

  it('merges and sorts events by changed_at descending', () => {
    const merged = mergeAuditFeedEvents([
      mapAuditItemToDashboardEvent(
        sampleAudit({ changed_at: '2026-06-04T08:00:00Z', history_uuid: 'a' }),
        'chat',
        'service',
      ),
      mapAuditItemToDashboardEvent(
        sampleAudit({ changed_at: '2026-06-04T12:00:00Z', history_uuid: 'b' }),
        'user',
        'credential',
      ),
    ]);
    expect(merged[0]?.target).toBe('user');
    expect(merged[1]?.target).toBe('chat');
  });
});
