// Re-export types from strategy.ts
export {
  StrategyType,
  type StrategyParameters,
  type MACrossoverParameters,
  type RSIParameters,
  type BreakoutParameters,
  type StrategyPerformance,
  type Strategy,
  type Filter,
  type StrategyWithFilters,
  type MACDParameters,
  type BollingerBandsParameters,
  type IchimokuParameters,
  type PatternRecognitionParameters,
  type MultiFactorParameters,
} from './strategy';

// Re-export trading types
export type { Trade, OrderResult } from './trade';

// Export MarketData from marketTypes
export type { MarketData } from './marketTypes';

// Export extension related types
export type {
  PoloniexData,
  PoloniexTrade,
  TradingViewData,
  ExtensionMessage,
  ExtensionResponse,
} from './extension';

// Export common types
export type {
  GenericRecord,
  ApiResponse,
  WebSocketMessage,
  ErrorResponse,
  PaginationParams,
  FilterParams,
  ApiKeyCredentials,
  UserPreferences,
  EventHandler,
} from './common';

// Exchange service interface
export interface ExchangeService {
  placeOrder: (
    pair: string,
    side: 'buy' | 'sell',
    type: 'limit' | 'market',
    quantity: number,
    price?: number
  ) => Promise<OrderResult>;
  errors: string[];
  addError: (error: string) => void;
  clearErrors: () => void;
  refreshApiConnection: () => Promise<void>;
}

// Export TradingContextType from its own file
export type { TradingContextType } from './TradingContextType';

// Re-export types from the backtest file
export type {
  BacktestOptions,
  BacktestResult,
  BacktestTrade,
  OptimizationResult,
  BacktestMetrics,
} from './backtest';
