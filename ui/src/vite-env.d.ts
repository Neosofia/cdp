/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_USER_API_URL?: string;
  readonly VITE_CAPABILITIES_API_URL?: string;
  readonly VITE_CHAT_API_URL?: string;
  readonly VITE_CARE_EPISODE_API_URL?: string;
  readonly VITE_TEMPLATE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
