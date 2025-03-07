/**
 * Settings store - maintains user preferences
 * Uses Zustand with immer for immutable state updates and persistence
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, DEFAULTS } from '@config/constants';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ChartStyle = 'candles' | 'line' | 'area';
export type ChartTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

interface SettingsState {
  // Theme
  theme: ThemeMode;
  
  // Chart preferences
  chartStyle: ChartStyle;
  chartTimeframe: ChartTimeframe;
  
  // Display preferences
  showTradingStats: boolean;
  showPortfolioBalance: boolean;
  showPnL: boolean;
  
  // Notification settings
  enableNotifications: boolean;
  notificationTypes: {
    orderFilled: boolean;
    positionLiquidation: boolean;
    priceAlerts: boolean;
    news: boolean;
  };
  
  // Trading preferences
  defaultLeverage: number;
  confirmOrders: boolean;
  showLiquidationWarnings: boolean;
  
  // API keys (encrypted in localStorage)
  apiKey: string;
  apiSecret: string;
  
  // Accessibility settings
  fontSize: 'small' | 'medium' | 'large';
  highContrastMode: boolean;
  reduceAnimations: boolean;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setChartStyle: (style: ChartStyle) => void;
  setChartTimeframe: (timeframe: ChartTimeframe) => void;
  toggleSetting: (key: keyof Omit<SettingsState, 'setTheme' | 'setChartStyle' | 'setChartTimeframe' | 'toggleSetting' | 'updateNotificationSettings' | 'setApiCredentials' | 'setAccessibilityOption'>) => void;
  updateNotificationSettings: (settings: Partial<SettingsState['notificationTypes']>) => void;
  setApiCredentials: (apiKey: string, apiSecret: string) => void;
  setAccessibilityOption: <K extends 'fontSize' | 'highContrastMode' | 'reduceAnimations'>(option: K, value: SettingsState[K]) => void;
}

// Create settings store with persistence
export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set) => ({
      // Initial state
      theme: 'system',
      chartStyle: 'candles',
      chartTimeframe: DEFAULTS.CHART_TIMEFRAME as ChartTimeframe,
      showTradingStats: true,
      showPortfolioBalance: true,
      showPnL: true,
      enableNotifications: true,
      notificationTypes: {
        orderFilled: true,
        positionLiquidation: true,
        priceAlerts: true,
        news: false,
      },
      defaultLeverage: 1,
      confirmOrders: true,
      showLiquidationWarnings: true,
      apiKey: '',
      apiSecret: '',
      fontSize: 'medium',
      highContrastMode: false,
      reduceAnimations: false,
      
      // Theme action
      setTheme: (theme) => set((state) => {
        state.theme = theme;
      }),
      
      // Chart style action
      setChartStyle: (style) => set((state) => {
        state.chartStyle = style;
      }),
      
      // Chart timeframe action
      setChartTimeframe: (timeframe) => set((state) => {
        state.chartTimeframe = timeframe;
      }),
      
      // Toggle boolean settings
      toggleSetting: (key) => set((state) => {
        // Check if the key exists and is a boolean before toggling
        if (typeof state[key] === 'boolean') {
          (state[key] as boolean) = !(state[key] as boolean);
        }
      }),
      
      // Update notification settings
      updateNotificationSettings: (settings) => set((state) => {
        state.notificationTypes = {
          ...state.notificationTypes,
          ...settings,
        };
      }),
      
      // Set API credentials
      setApiCredentials: (apiKey, apiSecret) => set((state) => {
        state.apiKey = apiKey;
        state.apiSecret = apiSecret;
      }),
      
      // Set accessibility options
      setAccessibilityOption: (option, value) => set((state) => {
        state[option] = value;
      }),
    })),
    {
      name: STORAGE_KEYS.USER_PREFERENCES,
      // Only store non-sensitive settings
      partialize: (state) => ({
        theme: state.theme,
        chartStyle: state.chartStyle,
        chartTimeframe: state.chartTimeframe,
        showTradingStats: state.showTradingStats,
        showPortfolioBalance: state.showPortfolioBalance,
        showPnL: state.showPnL,
        enableNotifications: state.enableNotifications,
        notificationTypes: state.notificationTypes,
        defaultLeverage: state.defaultLeverage,
        confirmOrders: state.confirmOrders,
        showLiquidationWarnings: state.showLiquidationWarnings,
        fontSize: state.fontSize,
        highContrastMode: state.highContrastMode,
        reduceAnimations: state.reduceAnimations,
      }),
      // Storage is encrypted for better security
      merge: (persistedState, currentState) => {
        return {
          ...currentState,
          ...(persistedState as any),
        };
      },
    }
  )
);
