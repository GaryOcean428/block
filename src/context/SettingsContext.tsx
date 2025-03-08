import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStorageItem, setStorageItem, STORAGE_KEYS, isStorageAvailable } from '../utils/storage';
import { supabase } from '../services/supabase';
import { getCurrentUser } from '../services/auth';
import { getUserApiKeys, saveUserApiKeys, deleteUserApiKeys } from '../services/supabase';

interface SettingsContextType {
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
  updateSettings: (settings: Partial<SettingsState>) => void;
  resetSettings: () => void;
  hasStoredCredentials: boolean;
  isAuthenticated: boolean;
  userId: string | null;
}

interface SettingsState {
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

const defaultSettings: SettingsState = {
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

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Check if we can access localStorage
  const canUseStorage = isStorageAvailable();

  // Add authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get initial settings from localStorage or environment variables
  const getInitialSettings = (): SettingsState => {
    if (!canUseStorage) {
      return {
        ...defaultSettings,
        apiKey: '',
        apiSecret: '',
      };
    }

    return {
      // Non-sensitive settings stored in localStorage is fine
      apiKey: '',
      apiSecret: '',
      isLiveTrading: getStorageItem(STORAGE_KEYS.IS_LIVE_TRADING, false),
      darkMode: getStorageItem(STORAGE_KEYS.DARK_MODE, false),
      defaultPair: getStorageItem(STORAGE_KEYS.DEFAULT_PAIR, 'BTC-USDT'),
      emailNotifications: getStorageItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS, true),
      tradeNotifications: getStorageItem(STORAGE_KEYS.TRADE_NOTIFICATIONS, true),
      priceAlerts: getStorageItem(STORAGE_KEYS.PRICE_ALERTS, false),
      chatNotifications: getStorageItem(STORAGE_KEYS.CHAT_NOTIFICATIONS, true),
      showExtension: getStorageItem(STORAGE_KEYS.SHOW_EXTENSION, true),
    };
  };

  const [settings, setSettings] = useState<SettingsState>(getInitialSettings);
  const [hasStoredCredentials, setHasStoredCredentials] = useState<boolean>(false);

  // Check for authenticated user on load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const { user } = await getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.id);

        // Load user's API keys from Supabase
        const apiKeys = await getUserApiKeys(user.id);
        if (apiKeys) {
          setSettings(prev => ({
            ...prev,
            apiKey: apiKeys.api_key || '',
            apiSecret: apiKeys.api_secret || '',
          }));
          setHasStoredCredentials(Boolean(apiKeys.api_key && apiKeys.api_secret));
        }
      }
    };

    checkAuthStatus();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        setUserId(session.user.id);

        // Load user API keys when they sign in
        const apiKeys = await getUserApiKeys(session.user.id);
        if (apiKeys) {
          setSettings(prev => ({
            ...prev,
            apiKey: apiKeys.api_key || '',
            apiSecret: apiKeys.api_secret || '',
          }));
          setHasStoredCredentials(Boolean(apiKeys.api_key && apiKeys.api_secret));
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserId(null);

        // Clear API keys on sign out
        setSettings(prev => ({
          ...prev,
          apiKey: '',
          apiSecret: '',
        }));
        setHasStoredCredentials(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Check if we have credentials stored
  useEffect(() => {
    setHasStoredCredentials(Boolean(settings.apiKey && settings.apiSecret));
  }, [settings.apiKey, settings.apiSecret]);

  // Update settings in state and persistence
  const updateSettings = async (newSettings: Partial<SettingsState>) => {
    // Special handling for API keys - store them in Supabase if authenticated
    if ((newSettings.apiKey !== undefined || newSettings.apiSecret !== undefined) && userId) {
      const updatedApiKey = newSettings.apiKey !== undefined ? newSettings.apiKey : settings.apiKey;
      const updatedApiSecret =
        newSettings.apiSecret !== undefined ? newSettings.apiSecret : settings.apiSecret;

      await saveUserApiKeys(userId, updatedApiKey, updatedApiSecret);
    }

    setSettings(prev => {
      const updated = { ...prev, ...newSettings };

      // Special handling for live trading mode
      if (newSettings.isLiveTrading !== undefined) {
        // Only allow live trading if we have API credentials
        if (newSettings.isLiveTrading && (!updated.apiKey || !updated.apiSecret)) {
          console.log('Cannot enable live trading without API credentials');
          updated.isLiveTrading = false;
        }
      }

      // Only persist non-sensitive settings to localStorage if it's available
      if (canUseStorage) {
        // We don't store API keys in localStorage
        const safeSettings = { ...newSettings };
        delete safeSettings.apiKey;
        delete safeSettings.apiSecret;

        // Persist each updated setting to localStorage
        Object.entries(safeSettings).forEach(([key, value]) => {
          const storageKey = STORAGE_KEYS[key.toUpperCase()] || `poloniex_${key}`;
          setStorageItem(storageKey, value);
        });
      }

      return updated;
    });
  };

  // Reset all settings to default
  const resetSettings = async () => {
    setSettings(defaultSettings);

    // Delete API keys from Supabase if authenticated
    if (userId) {
      await deleteUserApiKeys(userId);
    }

    if (canUseStorage) {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        updateSettings,
        resetSettings,
        hasStoredCredentials,
        isAuthenticated,
        userId,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
