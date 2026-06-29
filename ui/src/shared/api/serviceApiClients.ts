import type { paths as AuthenticationPaths } from '@/shared/api/generated/authentication.schema';
import type { paths as CapabilitiesPaths } from '@/shared/api/generated/capabilities.schema';
import type { paths as CareEpisodePaths } from '@/shared/api/generated/care-episode.schema';
import type { paths as ChatPaths } from '@/shared/api/generated/chat.schema';
import type { paths as UserPaths } from '@/shared/api/generated/user.schema';
import {
  AUTH_API,
  CAPABILITIES_API,
  CARE_EPISODE_API,
  CHAT_API,
  USER_API,
} from '@/shared/platform/apiBases';
import { createPlatformOpenApiClient } from '@/shared/platform/platformOpenApiClient';

export function userApiClient(token: string, activeActor: string) {
  return createPlatformOpenApiClient<UserPaths>(USER_API, token, activeActor);
}

export function careEpisodeApiClient(token: string, activeActor: string) {
  if (!CARE_EPISODE_API) {
    throw new Error('Care episode service is not configured');
  }
  return createPlatformOpenApiClient<CareEpisodePaths>(CARE_EPISODE_API, token, activeActor);
}

export function chatApiClient(token: string, activeActor: string) {
  if (!CHAT_API) {
    throw new Error('Chat service is not configured');
  }
  return createPlatformOpenApiClient<ChatPaths>(CHAT_API, token, activeActor);
}

export function authenticationApiClient(token: string, activeActor: string) {
  return createPlatformOpenApiClient<AuthenticationPaths>(AUTH_API, token, activeActor);
}

export function capabilitiesApiClient(token: string, activeActor: string) {
  return createPlatformOpenApiClient<CapabilitiesPaths>(CAPABILITIES_API, token, activeActor);
}
