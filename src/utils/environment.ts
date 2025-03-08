// Environment detection and configuration with strong typing

/**
 * Environment types supported by the application
 */
export enum EnvironmentType {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
  EXTENSION = 'extension',
  TEST = 'test',
}

/**
 * Runtime context of the application
 */
export enum RuntimeContext {
  BROWSER = 'browser',
  NODE = 'node',
  EXTENSION = 'extension',
  UNKNOWN = 'unknown',
}

// Environment detectors with TypeScript safety
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_NODE = !IS_BROWSER && typeof process !== 'undefined';
export const IS_WEBCONTAINER =
  IS_BROWSER && window.location && window.location.hostname.includes('webcontainer-api.io');
export const IS_LOCAL_DEV =
  IS_BROWSER && !IS_WEBCONTAINER && window.location.hostname === 'localhost';
export const IS_EXTENSION =
  IS_BROWSER && typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
export const IS_TEST = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

/**
 * Detect the current runtime context
 */
export const getRuntimeContext = (): RuntimeContext => {
  if (IS_EXTENSION) return RuntimeContext.EXTENSION;
  if (IS_BROWSER) return RuntimeContext.BROWSER;
  if (IS_NODE) return RuntimeContext.NODE;
  return RuntimeContext.UNKNOWN;
};

/**
 * Port configuration to avoid default ports (e.g., 3000)
 */
export const PORTS = {
  DEV_SERVER: 5173, // Vite dev server
  API_SERVER: 8765, // Main API server
  WEBSOCKET: 8766, // WebSocket server
};

/**
 * Detect the current environment
 */
export const getEnvironment = (): EnvironmentType => {
  if (IS_EXTENSION) return EnvironmentType.EXTENSION;
  if (IS_TEST) return EnvironmentType.TEST;
  if (IS_WEBCONTAINER) return EnvironmentType.STAGING;
  if (IS_LOCAL_DEV) return EnvironmentType.DEVELOPMENT;
  return EnvironmentType.PRODUCTION;
};

/**
 * Base URL configuration by environment
 */
interface BaseUrlConfig {
  api: string;
  app: string;
  websocket: string;
  poloniexApi: string;
}

const BASE_URL_CONFIG: Record<EnvironmentType, BaseUrlConfig> = {
  [EnvironmentType.PRODUCTION]: {
    api: `https://api.your-production-domain.com:${PORTS.API_SERVER}`,
    app: 'https://your-production-domain.com',
    websocket: `wss://ws.your-production-domain.com:${PORTS.WEBSOCKET}`,
    poloniexApi: 'https://api.poloniex.com',
  },
  [EnvironmentType.STAGING]: {
    api: `https://api.staging.your-production-domain.com:${PORTS.API_SERVER}`,
    app: 'https://staging.your-production-domain.com',
    websocket: `wss://ws.staging.your-production-domain.com:${PORTS.WEBSOCKET}`,
    poloniexApi: 'https://api.poloniex.com',
  },
  [EnvironmentType.DEVELOPMENT]: {
    api: `http://localhost:${PORTS.API_SERVER}`,
    app: `http://localhost:${PORTS.DEV_SERVER}`,
    websocket: `ws://localhost:${PORTS.WEBSOCKET}`,
    poloniexApi: 'https://api.poloniex.com',
  },
  [EnvironmentType.EXTENSION]: {
    api: `http://localhost:${PORTS.API_SERVER}`,
    app: `http://localhost:${PORTS.DEV_SERVER}`,
    websocket: `ws://localhost:${PORTS.WEBSOCKET}`,
    poloniexApi: 'https://api.poloniex.com',
  },
  [EnvironmentType.TEST]: {
    api: `http://localhost:${PORTS.API_SERVER}`,
    app: `http://localhost:${PORTS.DEV_SERVER}`,
    websocket: `ws://localhost:${PORTS.WEBSOCKET}`,
    poloniexApi: 'https://api.poloniex.com',
  },
};

/**
 * Get the base URL for the application
 */
export const getBaseUrl = (): string => {
  const env = getEnvironment();
  return BASE_URL_CONFIG[env].app;
};

/**
 * Get the API URL for the application
 */
export const getApiUrl = (): string => {
  const env = getEnvironment();
  return BASE_URL_CONFIG[env].api;
};

/**
 * Get the WebSocket URL for the application
 */
export const getWebsocketUrl = (): string => {
  const env = getEnvironment();
  return BASE_URL_CONFIG[env].websocket;
};

/**
 * Get the Poloniex API URL
 */
export const getPoloniexApiUrl = (): string => {
  const env = getEnvironment();
  return BASE_URL_CONFIG[env].poloniexApi;
};

/**
 * Environment configuration object for global use
 */
export const ENV_CONFIG = {
  environment: getEnvironment(),
  runtimeContext: getRuntimeContext(),
  baseUrl: getBaseUrl(),
  apiUrl: getApiUrl(),
  websocketUrl: getWebsocketUrl(),
  poloniexApiUrl: getPoloniexApiUrl(),
  extensionId: 'mnmijjdadadomgmpopijhghadplbbjoc',
  isProduction: getEnvironment() === EnvironmentType.PRODUCTION,
  isDevelopment: getEnvironment() === EnvironmentType.DEVELOPMENT,
  isStaging: getEnvironment() === EnvironmentType.STAGING,
  isExtension: IS_EXTENSION,
  isTest: IS_TEST,
};

export default ENV_CONFIG;
