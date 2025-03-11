import type { Trade, OrderResult, MarketData } from './index';
import type { Strategy } from './strategy';

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
