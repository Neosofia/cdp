import type { components } from '@/shared/api/generated/user.schema';
import { userApiClient } from '@/shared/api/serviceApiClients';
import { USER_API } from '@/shared/platform/apiBases';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

type RegistryUser = components['schemas']['User'];

export async function fetchSessionRegistryUser(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<RegistryUser> {
  const client = userApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.GET('/api/v1/users/{user_uuid}', {
      params: { path: { user_uuid: userUuid } },
    }),
  );
}

export async function acceptSessionTermsOfService(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<RegistryUser> {
  const client = userApiClient(token, activeActor);
  const user = unwrapOpenApiResponse(
    await client.PATCH('/api/v1/users/{user_uuid}', {
      params: { path: { user_uuid: userUuid } },
      body: { tos_accepted: true },
    }),
  );
  if (user.tos_accepted !== true) {
    throw new Error('Acceptance was not saved. Try again or contact support.');
  }
  return user;
}

/** Exported for legacy URL builders that still compose list paths manually. */
export { USER_API };
