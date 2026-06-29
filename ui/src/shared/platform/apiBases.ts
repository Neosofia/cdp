export const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014';
export const USER_API = import.meta.env.VITE_USER_API_URL ?? 'http://localhost:8018';
export const CAPABILITIES_API = import.meta.env.VITE_CAPABILITIES_API_URL ?? 'http://localhost:8019';
export const CHAT_API = import.meta.env.VITE_CHAT_API_URL ?? 'http://localhost:8001';
export const CARE_EPISODE_API =
  (import.meta.env.VITE_CARE_EPISODE_API_URL as string | undefined) ?? 'http://localhost:8015';
export const TEMPLATE_API = import.meta.env.VITE_TEMPLATE_API_URL ?? 'http://localhost:8900';
export const IS_PROD = import.meta.env.PROD;
