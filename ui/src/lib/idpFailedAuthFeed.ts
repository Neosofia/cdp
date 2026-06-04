import {
  fetchIdpFailedAuthentications,
  type IdpFailedAuthenticationItem,
} from '@/lib/idpFailedAuthApi';
import type { DashboardAuditEvent } from '@/lib/platformAuditFeed';

const METHOD_LABELS: Record<string, string> = {
  password: 'Password',
  oauth: 'OAuth',
  magic_auth: 'Magic link',
  sso: 'SSO',
  mfa: 'MFA',
  email_verification: 'Email verification',
};

export function methodLabel(method: string): string {
  const key = method.trim().toLowerCase();
  if (METHOD_LABELS[key]) return METHOD_LABELS[key];
  return method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Sign-in';
}

export function failedAuthSubject(item: IdpFailedAuthenticationItem): string {
  const email = item.email?.trim();
  if (email) return email;
  const userId = item.idp_user_id?.trim();
  if (userId) return userId;
  return 'Unknown principal';
}

export function failedAuthDetail(item: IdpFailedAuthenticationItem): string {
  const code = item.error_code?.trim();
  const message = item.error_message?.trim();
  if (code && message) return `${code} — ${message}`;
  if (code) return code;
  if (message) return message;
  return 'Sign-in failed';
}

/** Failed sign-ins surface in the operator audit feed at warning severity by default. */
export function mapFailedAuthToAuditEvent(item: IdpFailedAuthenticationItem): DashboardAuditEvent {
  const label = methodLabel(item.method);
  return {
    id: `idp-${item.id}`,
    actor: failedAuthSubject(item),
    action: `${label} sign-in failed`,
    target: failedAuthDetail(item),
    changedAt: item.occurred_at,
    level: 'warning',
  };
}

export const FAILED_SIGN_IN_WINDOW_MS = 24 * 60 * 60 * 1000;

const FAILED_SIGN_IN_PAGE_LIMIT = 100;

export function countFailedSignInsInWindow(
  items: IdpFailedAuthenticationItem[],
  nowMs = Date.now(),
): number {
  const windowStart = nowMs - FAILED_SIGN_IN_WINDOW_MS;
  return items.filter((item) => {
    const occurredMs = Date.parse(item.occurred_at);
    return !Number.isNaN(occurredMs) && occurredMs >= windowStart;
  }).length;
}

export async function countFailedSignInsLast24Hours(
  token: string,
  activeActor: string,
): Promise<number> {
  let total = 0;
  let after: string | null = null;

  // WorkOS may return rows oldest-first per page even with order=desc; scan every
  // page and count in-window events instead of stopping at the first older row.
  for (;;) {
    const page = await fetchIdpFailedAuthentications(
      token,
      activeActor,
      FAILED_SIGN_IN_PAGE_LIMIT,
      after,
    );
    if (page.items.length === 0) break;

    total += countFailedSignInsInWindow(page.items, Date.now());

    if (!page.after) break;
    after = page.after;
  }

  return total;
}

export async function fetchIdpFailedAuthAuditEvents(
  token: string,
  activeActor: string,
): Promise<DashboardAuditEvent[]> {
  const { items } = await fetchIdpFailedAuthentications(token, activeActor, 25);
  return items.map(mapFailedAuthToAuditEvent);
}
