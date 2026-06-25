/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STAGE1_URL: string;
  readonly VITE_COMPLIANCE_URL: string;
  readonly VITE_AUTH_REQUIRED: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_ALLOWED_ROLES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
