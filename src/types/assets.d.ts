/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVICE_ADAPTER_MODE?: string;
  readonly VITE_ADMIN_ADAPTER_MODE?: string;
  readonly VITE_AUTH_ADAPTER_MODE?: string;
  readonly VITE_COURSES_ADAPTER_MODE?: string;
  readonly VITE_LESSONS_ADAPTER_MODE?: string;
  readonly VITE_QUIZZES_ADAPTER_MODE?: string;
  readonly VITE_PROGRESS_ADAPTER_MODE?: string;
  readonly VITE_SUBSCRIPTION_ADAPTER_MODE?: string;
  readonly VITE_NOTIFICATIONS_ADAPTER_MODE?: string;
  readonly VITE_NOTES_ADAPTER_MODE?: string;
  readonly VITE_DASHBOARD_ADAPTER_MODE?: string;
  readonly VITE_COMMUNITY_ADAPTER_MODE?: string;
  readonly VITE_TUTOR_ADAPTER_MODE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.gif" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}
