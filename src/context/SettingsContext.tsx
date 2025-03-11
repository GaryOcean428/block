import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getStorageItem, setStorageItem, STORAGE_KEYS, isStorageAvailable } from '../utils/storage';
import { supabase } from '../services/supabase';
import { getCurrentUser } from '../services/auth';
import { getUserApiKeys, saveUserApiKeys, deleteUserApiKeys } from '../services/supabase';
import {
  SettingsContext,
  type SettingsState,
  defaultSettings,
  SESSION_KEYS,
} from './SettingsContextDefinitions';

// No exports here - only use the index.ts for exports

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

    // Try to get API keys from sessionStorage for temporary persistence
    let tempApiKey = '';
    let tempApiSecret = '';

    try {
      tempApiKey = sessionStorage.getItem(SESSION_KEYS.API_KEY) ?? '';
      tempApiSecret = sessionStorage.getItem(SESSION_KEYS.API_SECRET) ?? '';
    } catch (e) {
      console.warn('Failed to access sessionStorage:', e);
    }

    return {
      // Non-sensitive settings stored in localStorage is fine
      apiKey: tempApiKey,
      apiSecret: tempApiSecret,
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
            apiKey: apiKeys.api_key ?? '',
            apiSecret: apiKeys.api_secret ?? '',
          }));
          setHasStoredCredentials(Boolean(apiKeys.api_key && apiKeys.api_secret));

          // Store in session storage for persistence during navigation
          try {
            if (apiKeys.api_key) sessionStorage.setItem(SESSION_KEYS.API_KEY, apiKeys.api_key);
            if (apiKeys.api_secret)
              sessionStorage.setItem(SESSION_KEYS.API_SECRET, apiKeys.api_secret);
          } catch (e) {
            console.warn('Failed to store API keys in session storage:', e);
          }
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
            apiKey: apiKeys.api_key ?? '',
            apiSecret: apiKeys.api_secret ?? '',
          }));
          setHasStoredCredentials(Boolean(apiKeys.api_key && apiKeys.api_secret));

          // Store in session storage for persistence during navigation
          try {
            if (apiKeys.api_key) sessionStorage.setItem(SESSION_KEYS.API_KEY, apiKeys.api_key);
            if (apiKeys.api_secret)
              sessionStorage.setItem(SESSION_KEYS.API_SECRET, apiKeys.api_secret);
          } catch (e) {
            console.warn('Failed to store API keys in session storage:', e);
          }
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

        // Clear from session storage
        try {
          sessionStorage.removeItem(SESSION_KEYS.API_KEY);
          sessionStorage.removeItem(SESSION_KEYS.API_SECRET);
        } catch (e) {
          console.warn('Failed to clear API keys from session storage:', e);
        }
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
  const updateSettings = useCallback(
    async (newSettings: Partial<SettingsState>): Promise<boolean> => {
      try {
        // Update keys in session storage immediately to prevent loss during navigation
        if (
          canUseStorage &&
          (newSettings.apiKey !== undefined || newSettings.apiSecret !== undefined)
        ) {
          try {
            const updatedApiKey = newSettings.apiKey ?? settings.apiKey;
            const updatedApiSecret = newSettings.apiSecret ?? settings.apiSecret;

            if (updatedApiKey) sessionStorage.setItem(SESSION_KEYS.API_KEY, updatedApiKey);
            if (updatedApiSecret) sessionStorage.setItem(SESSION_KEYS.API_SECRET, updatedApiSecret);
          } catch (e) {
            console.warn('Failed to update API keys in session storage:', e);
          }
        }

        // Special handling for API keys - store them in Supabase if authenticated
        if ((newSettings.apiKey !== undefined || newSettings.apiSecret !== undefined) && userId) {
          const updatedApiKey = newSettings.apiKey ?? settings.apiKey;
          const updatedApiSecret = newSettings.apiSecret ?? settings.apiSecret;

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
              // Use type assertion to safely access STORAGE_KEYS
              const storageKey =
                (STORAGE_KEYS as Record<string, string>)[key.toUpperCase()] ?? `poloniex_${key}`;
              setStorageItem(storageKey, value);
            });
          }

          return updated;
        });

        return true;
      } catch (error) {
        console.error('Failed to update settings:', error);
        return false;
      }
    },
    [canUseStorage, settings.apiKey, settings.apiSecret, userId]
  );

  // Reset all settings to default
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);

    // Delete API keys from Supabase if authenticated
    if (userId) {
      void deleteUserApiKeys(userId);
    }

    // Clear from session storage
    try {
      sessionStorage.removeItem(SESSION_KEYS.API_KEY);
      sessionStorage.removeItem(SESSION_KEYS.API_SECRET);
    } catch (e) {
      console.warn('Failed to clear API keys from session storage:', e);
    }

    if (canUseStorage) {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }, [canUseStorage, userId]);

  // Use useMemo to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...settings,
      updateSettings,
      resetSettings,
      hasStoredCredentials,
      isAuthenticated,
      userId,
    }),
    [settings, hasStoredCredentials, isAuthenticated, userId, updateSettings, resetSettings]
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};
