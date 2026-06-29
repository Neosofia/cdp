import createClient from 'openapi-fetch';

import { refreshAccessTokenIfPossible } from '@/shared/auth/auth';
import { apiErrorMessage } from '@/shared/platform/platformApiFetch';

export function createPlatformOpenApiClient<Paths extends object>(
  baseUrl: string,
  token: string,
  activeActor: string,
) {
  const auth = { bearer: token };
  const client = createClient<Paths>({ baseUrl });

  client.use({
    onRequest({ request }) {
      request.headers.set('Authorization', `Bearer ${auth.bearer}`);
      request.headers.set('X-Active-Actor', activeActor);
      return request;
    },
    async onResponse({ request, response }) {
      if (response.status !== 401) {
        return response;
      }
      const refreshed = await refreshAccessTokenIfPossible();
      if (!refreshed) {
        return response;
      }
      auth.bearer = refreshed;
      const retry = new Request(request);
      retry.headers.set('Authorization', `Bearer ${auth.bearer}`);
      retry.headers.set('X-Active-Actor', activeActor);
      return fetch(retry);
    },
  });

  return client;
}

export function unwrapOpenApiResponse<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (result.error !== undefined) {
    throw new Error(apiErrorMessage(result.error, result.response.status));
  }
  if (result.data === undefined) {
    throw new Error(`HTTP ${result.response.status}`);
  }
  return result.data;
}
