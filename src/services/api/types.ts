/**
 * API Types for Poloniex Trading Platform
 *
 * This file contains TypeScript interfaces for the Poloniex API responses
 * and request parameters. The types provide strong type-safety for API interactions.
 */

/**
 * Common API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * API Error response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Poloniex Market Response
 */
export interface Market {
  symbol: string;
  baseCurrencyName: string;
  quoteCurrencyName: string;
  displayName: string;
  state: string;
  visibleStartTime: number;
  tradableStartTime: number;
}

/**
 * Market Summary
 */
export interface MarketSummary {
  symbol: string;
  open: string;
  high: string;
  low: string;
  close: string;
  quantity: string;
  amount: string;
  tradeCount: number;
  startTime: number;
  closeTime: number;
  displayName: string;
  dailyChange: string;
  bid?: string;
  bidQuantity?: string;
  ask?: string;
  askQuantity?: string;
}

/**
 * Currency Information
 */
export interface Currency {
  id: string;
  name: string;
  description?: string;
  type: string;
  logoUrl?: string;
  status: 'NORMAL' | 'DELISTED' | 'DISABLED';
  withdrawalFee?: string;
  minWithdrawal?: string;
  maxWithdrawal?: string;
  precision: number;
}

/**
 * Time Intervals for Chart/Candle Data
 */
export enum TimeInterval {
  MINUTE_1 = '1m',
  MINUTE_5 = '5m',
  MINUTE_15 = '15m',
  MINUTE_30 = '30m',
  HOUR_1 = '1h',
  HOUR_2 = '2h',
  HOUR_4 = '4h',
  HOUR_6 = '6h',
  HOUR_12 = '12h',
  DAY_1 = '1d',
  DAY_3 = '3d',
  WEEK_1 = '1w',
  MONTH_1 = '1M',
}

/**
 * Candle/Kline data
 */
export interface Candle {
  symbol: string;
  open: string;
  high: string;
  low: string;
  close: string;
  amount: string;
  quantity: string;
  buyTakerAmount: string;
  buyTakerQuantity: string;
  tradeCount: number;
  startTime: number;
  closeTime: number;
  interval: TimeInterval;
}

/**
 * Account Information
 */
export interface Account {
  accountId: string;
  accountType: 'SPOT' | 'FUTURES' | 'MARGIN';
  balances: Balance[];
}

/**
 * Balance Information
 */
export interface Balance {
  currency: string;
  available: string;
  hold: string;
}

/**
 * Order Type
 */
export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_MARKET = 'STOP_MARKET',
  STOP_LIMIT = 'STOP_LIMIT',
}

/**
 * Order Side
 */
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * Order Time In Force
 */
export enum TimeInForce {
  GOOD_TILL_CANCEL = 'GTC', // Good Till Cancel
  IMMEDIATE_OR_CANCEL = 'IOC', // Immediate or Cancel
  FILL_OR_KILL = 'FOK', // Fill or Kill
}

/**
 * Order Status
 */
export enum OrderStatus {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/**
 * Order Information
 */
export interface Order {
  id: string;
  symbol: string;
  accountId: string;
  clientOrderId?: string;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  quantity: string;
  price?: string;
  avgPrice?: string;
  stopPrice?: string;
  status: OrderStatus;
  filledQuantity: string;
  filledAmount: string;
  createTime: number;
  updateTime: number;
}

/**
 * Create Order Request Parameters
 */
export interface CreateOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  timeInForce?: TimeInForce;
  quantity: string;
  price?: string; // Required for LIMIT orders
  stopPrice?: string; // Required for STOP orders
  clientOrderId?: string;
}

/**
 * Trade Information
 */
export interface Trade {
  id: string;
  symbol: string;
  orderId: string;
  side: OrderSide;
  quantity: string;
  price: string;
  fee: string;
  feeCurrency: string;
  timestamp: number;
}

/**
 * WebSocket Message Types
 */
export enum WebSocketMessageType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  TICKER = 'ticker',
  MARKET_DATA = 'market_data',
  CANDLES = 'candles',
  TRADES = 'trades',
  ORDER_UPDATE = 'order_update',
  BALANCE_UPDATE = 'balance_update',
}

/**
 * WebSocket Subscription Parameters
 */
export interface WebSocketSubscription {
  type: WebSocketMessageType;
  symbols?: string[];
  interval?: TimeInterval;
}
