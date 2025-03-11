import { createContext } from 'react';

// Settings types and interfaces
export interface SettingsContextType {
  apiKey: string;
  apiSecret: string;
  isLiveTrading: boolean;
  darkMode: boolean;
  defaultPair: string;
  emailNotifications: boolean;
  tradeNotifications: boolean;
  priceAlerts: boolean;
  chatNotifications: boolean;
  showExtension: boolean;
  updateSettings: (settings: Partial<SettingsState>) => Promise<boolean>;
  resetSettings: () => void;
  hasStoredCredentials: boolean;
  isAuthenticated: boolean;
  userId: string | null;
}

export interface SettingsState {
  apiKey: string;
  apiSecret: string;
  isLiveTrading: boolean;
  darkMode: boolean;
  defaultPair: string;
  emailNotifications: boolean;
  tradeNotifications: boolean;
  priceAlerts: boolean;
  chatNotifications: boolean;
  showExtension: boolean;
}

export const defaultSettings: SettingsState = {
  apiKey: '',
  apiSecret: '',
  isLiveTrading: false,
  darkMode: false,
  defaultPair: 'BTC-USDT',
  emailNotifications: true,
  tradeNotifications: true,
  priceAlerts: false,
  chatNotifications: true,
  showExtension: true,
};

// Session storage keys (temporary, in-memory storage)
export const SESSION_KEYS = {
  API_KEY: 'poloniex_temp_api_key',
  API_SECRET: 'poloniex_temp_api_secret',
};

// Create a context with undefined default value
export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
