/** Platform HTTP services the CDP UI is built to call (from VITE_* API URLs). */

export type PlatformServiceId =
  | 'authentication'
  | 'user'
  | 'capabilities'
  | 'chat'
  | 'care-episode'
  | 'notification'
  | 'template';

export type PlatformServiceDefinition = {
  id: PlatformServiceId;
  /** Display name in the operator dashboard */
  label: string;
  resolveApiBase: () => string | undefined;
};

function envApiBase(key: string): () => string | undefined {
  return () => {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };
}

/** Order matches operator mental model: identity → directory → entitlements → clinical stack → demo template */
export const PLATFORM_SERVICES: PlatformServiceDefinition[] = [
  { id: 'authentication', label: 'authentication', resolveApiBase: envApiBase('VITE_AUTH_API_URL') },
  { id: 'user', label: 'user', resolveApiBase: envApiBase('VITE_USER_API_URL') },
  { id: 'capabilities', label: 'capabilities', resolveApiBase: envApiBase('VITE_CAPABILITIES_API_URL') },
  { id: 'chat', label: 'chat', resolveApiBase: envApiBase('VITE_CHAT_API_URL') },
  { id: 'care-episode', label: 'care-episode', resolveApiBase: envApiBase('VITE_CARE_EPISODE_API_URL') },
  { id: 'notification', label: 'notification', resolveApiBase: envApiBase('VITE_NOTIFICATION_API_URL') },
  { id: 'template', label: 'python-template', resolveApiBase: envApiBase('VITE_TEMPLATE_API_URL') },
];

export function healthCheckUrl(apiBase: string): string {
  return `${apiBase.replace(/\/+$/, '')}/health`;
}
