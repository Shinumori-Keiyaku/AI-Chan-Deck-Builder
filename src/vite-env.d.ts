/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHEET_ID?: string;
  readonly VITE_SHEET_TAB?: string;
  readonly VITE_GOOGLE_SHEETS_API_KEY?: string;
  readonly VITE_GOOGLE_SHEETS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
