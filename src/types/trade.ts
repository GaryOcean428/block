/**
 * Represents a trading transaction
 */
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
  pnl?: number;
  pnlPercent?: number;
  metadata?: Record<string, any>;
}

/**
 * Result of placing an order on an exchange
 */
export interface OrderResult {
  orderId: string;
  status: string;
  message?: string;
}
