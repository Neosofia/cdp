import { refreshAccessTokenIfPossible } from '@/lib/auth';

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
