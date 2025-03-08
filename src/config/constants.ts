/**
 * Application-wide constants and configuration values
 * Centralizes all configuration to make it easier to maintain and update
 */

// API Endpoints
export const API = {
  // Poloniex API Endpoints
  FUTURES_BASE_URL: 'https://futures-api.poloniex.com/v3',
  SPOT_BASE_URL: 'https://api.poloniex.com/v3',

  // WebSocket Endpoints
  FUTURES_WS_URL: 'wss://futures-ws.poloniex.com/ws/public',
  FUTURES_PRIVATE_WS_URL: 'wss://futures-ws.poloniex.com/ws/private',

  // Rate Limiting Configuration
  RATE_LIMITS: {
    PUBLIC_REQUESTS_PER_SECOND: 10,
    PRIVATE_REQUESTS_PER_SECOND: 5,
    ORDERS_PER_SECOND: 2,
  },

  // Request Timeout Configurations
  TIMEOUT_MS: 5000,
  LONG_TIMEOUT_MS: 10000,
};

// Environment Configuration
export const ENV = {
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  POLONIEX_API_KEY: import.meta.env.VITE_POLONIEX_API_KEY,
  POLONIEX_API_SECRET: import.meta.env.VITE_POLONIEX_API_SECRET,
};

// Application Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/',
  STRATEGIES: '/strategies',
  MARKET_ANALYSIS: '/charts',
  ACCOUNT: '/account',
  SETTINGS: '/settings',
  EXTENSION: '/extension',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  API_KEY: 'poloniex_api_key',
  API_SECRET: 'poloniex_api_secret',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  STRATEGIES: 'saved_strategies',
  AUTH_TOKEN: 'auth_token',
};

// Default Configurations
export const DEFAULTS = {
  THEME: 'light',
  CHART_TIMEFRAME: '1h',
  PAIRS: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'DOGE-USDT'],
  REFRESH_INTERVAL: 30000, // 30 seconds
};

// Feature Flags
export const FEATURES = {
  ENABLE_BACKTESTING: true,
  ENABLE_LIVE_TRADING: false, // Disabled by default for safety
  ENABLE_NOTIFICATIONS: true,
  ENABLE_CHAT: true,
  ENABLE_MARKET_ANALYSIS: true,
};
