// Re-export types from strategy.ts
export {
  StrategyType,
  type StrategyParameters,
  type MACrossoverParameters,
  type RSIParameters,
  type BreakoutParameters,
  type StrategyPerformance,
  type Strategy,
} from './strategy';

// Direct exports of basic types
export interface MarketData {
  pair: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
}

export interface Trade {
  id: string;
  pair: string;
  timestamp: number;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  total: number;
  strategyId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface OrderResult {
  orderId: string;
  status: string;
  message?: string;
}

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

// Import Strategy to use in TradingContextType
import type { Strategy } from './strategy';

// TradingContext type
export interface TradingContextType {
  marketData: MarketData[];
  trades: Trade[];
  strategies: Strategy[];
  activeStrategies: string[];
  accountBalance: number;
  isLoading: boolean;
  isMockMode: boolean;
  refreshApiConnection: () => Promise<void>;
  addStrategy: (strategy: Strategy) => void;
  removeStrategy: (id: string) => void;
  toggleStrategyActive: (id: string) => void;
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
}

// Re-export types from the backtest file
export type {
  BacktestOptions,
  BacktestResult,
  BacktestTrade,
  OptimizationResult,
  BacktestMetrics,
} from './backtest';
