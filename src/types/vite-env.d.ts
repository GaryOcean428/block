/// <reference types="vite/client" />

// This enhances the ImportMeta interface to include env properties
interface ImportMeta {
  readonly env: {
    readonly [key: string]: string | boolean | undefined;
    readonly VITE_API_URL: string;
    readonly VITE_API_KEY: string;
    readonly VITE_API_SECRET: string;
    readonly VITE_ENVIRONMENT: 'development' | 'production' | 'test';
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
  };
}
