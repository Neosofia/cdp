import { refreshAccessTokenIfPossible } from '@/shared/auth/auth';

export function apiErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as { message?: unknown; error?: unknown };
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
    if (record.error === 'upstream_error') {
      return 'A platform registry service is temporarily unavailable. Try again shortly.';
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }
  }
  if (status === 502) {
    return 'A platform registry service is temporarily unavailable. Try again shortly.';
  }
  return `HTTP ${status}`;
}

export async function platformApiFetch(
  url: string,
  token: string,
  activeActor: string,
  init: RequestInit = {},
): Promise<Response> {
  const run = (bearer: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${bearer}`);
    headers.set('X-Active-Actor', activeActor);
    return fetch(url, { ...init, headers });
  };

  let res = await run(token);
  if (res.status === 401) {
    const refreshed = await refreshAccessTokenIfPossible();
    if (refreshed) {
      res = await run(refreshed);
    }
  }
  return res;
}
