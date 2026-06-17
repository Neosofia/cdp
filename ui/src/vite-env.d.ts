/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_USER_API_URL?: string;
  readonly VITE_CAPABILITIES_API_URL?: string;
  readonly VITE_CHAT_API_URL?: string;
  readonly VITE_CARE_EPISODE_API_URL?: string;
  readonly VITE_NOTIFICATION_API_URL?: string;
  readonly VITE_TEMPLATE_API_URL?: string;
  readonly VITE_AUTH_BASE_URL?: string;
  readonly VITE_DEMO_TEMPLATE_DISPLAY_CODE?: string;
  readonly VITE_DEMO_TEMPLATE_PATIENT_UUID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
