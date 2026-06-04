import { describe, expect, it } from 'vitest';
import type { IdpFailedAuthenticationItem } from '@/lib/idpFailedAuthApi';
import {
  countFailedSignInsInWindow,
  FAILED_SIGN_IN_WINDOW_MS,
  failedAuthDetail,
  failedAuthSubject,
  mapFailedAuthToAuditEvent,
  methodLabel,
} from '@/lib/idpFailedAuthFeed';
import { mergeAuditFeedEvents } from '@/lib/platformAuditFeed';

function sampleFailedAuth(
  partial: Partial<IdpFailedAuthenticationItem> = {},
): IdpFailedAuthenticationItem {
  return {
    id: 'event_1',
    occurred_at: '2026-06-04T10:18:14Z',
    method: 'password',
    status: 'failed',
    idp_user_id: 'user_01',
    email: 'ops@example.com',
    error_code: 'invalid_credentials',
    error_message: 'Invalid credentials',
    ip_address: '203.0.113.1',
    ...partial,
  };
}

describe('idpFailedAuthFeed', () => {
  it('labels sign-in methods for display', () => {
    expect(methodLabel('password')).toBe('Password');
    expect(methodLabel('magic_auth')).toBe('Magic link');
  });

  it('maps failed sign-ins into audit feed rows at warning level', () => {
    const event = mapFailedAuthToAuditEvent(sampleFailedAuth());
    expect(event.id).toBe('idp-event_1');
    expect(event.action).toBe('Password sign-in failed');
    expect(event.actor).toBe('ops@example.com');
    expect(event.target).toContain('invalid_credentials');
    expect(event.level).toBe('warning');
    expect(event.changedAt).toBe('2026-06-04T10:18:14Z');
  });

  it('falls back to idp user id when email is missing', () => {
    expect(failedAuthSubject(sampleFailedAuth({ email: null }))).toBe('user_01');
  });

  it('interleaves with service audits when merged', () => {
    const merged = mergeAuditFeedEvents([
      {
        id: 'svc-1',
        actor: 'ops',
        action: 'Updated credential',
        target: 'user',
        changedAt: '2026-06-04T08:00:00Z',
        level: 'info',
      },
      mapFailedAuthToAuditEvent(
        sampleFailedAuth({ id: 'b', occurred_at: '2026-06-04T12:00:00Z' }),
      ),
    ]);
    expect(merged[0]?.action).toBe('Password sign-in failed');
    expect(merged[0]?.level).toBe('warning');
    expect(merged[1]?.target).toBe('user');
  });

  it('builds detail from code and message', () => {
    expect(failedAuthDetail(sampleFailedAuth())).toBe(
      'invalid_credentials — Invalid credentials',
    );
  });

  it('counts only sign-in failures within the 24-hour window', () => {
    const nowMs = Date.parse('2026-06-04T12:00:00Z');
    const within = sampleFailedAuth({ occurred_at: '2026-06-04T10:00:00Z' });
    const outside = sampleFailedAuth({
      id: 'event_old',
      occurred_at: '2026-06-02T10:00:00Z',
    });
    expect(countFailedSignInsInWindow([within, outside], nowMs)).toBe(1);
    expect(FAILED_SIGN_IN_WINDOW_MS).toBe(86_400_000);
  });

  it('counts in-window events when provider returns oldest-first within a page', () => {
    const nowMs = Date.parse('2026-06-04T12:00:00Z');
    const page = [
      sampleFailedAuth({ id: 'old', occurred_at: '2026-05-08T05:21:47Z' }),
      sampleFailedAuth({ id: 'recent', occurred_at: '2026-06-04T10:18:14Z' }),
    ];
    expect(countFailedSignInsInWindow(page, nowMs)).toBe(1);
  });
});
