// Extension-related types

export interface PoloniexData {
  balance?: number;
  openPositions?: number;
  recentTrades?: PoloniexTrade[];
  [key: string]: unknown;
}

export interface PoloniexTrade {
  pair: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp?: number;
  [key: string]: unknown;
}

export interface TradingViewData {
  currentSymbol?: string;
  timeframe?: string;
  indicators?: string[];
  chartData?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  };
  [key: string]: unknown;
}

export interface ExtensionMessage<T = unknown> {
  type: string;
  data?: T;
  timestamp?: number;
  [key: string]: unknown;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
