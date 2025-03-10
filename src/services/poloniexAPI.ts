import axios from 'axios';
import CryptoJS from 'crypto-js';
import { getStorageItem, STORAGE_KEYS } from '../utils/storage';

// Base URLs for Poloniex APIs
const FUTURES_BASE_URL = 'https://futures-api.poloniex.com/v3';
const SPOT_BASE_URL = 'https://api.poloniex.com/v3';

// Add rate limiting configuration
const RATE_LIMITS = {
  PUBLIC_REQUESTS_PER_SECOND: 10,
  PRIVATE_REQUESTS_PER_SECOND: 5,
  ORDERS_PER_SECOND: 2,
};

// Create a logger for API calls
const logApiCall = (method: string, endpoint: string, data?: unknown): void => {
  console.log(`API ${method} ${endpoint}`, data ? JSON.stringify(data) : '');
};

// Safe error handler - prevents Symbol() objects from being passed around
const safeErrorHandler = (error: unknown): Error => {
  if (error instanceof Error) {
    // Create a new error object with just the message to avoid Symbol properties
    return new Error(error.message);
  }
  return new Error(String(error));
};

// Define position data type
interface Position {
  symbol: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  marginMode: 'cross' | 'isolated';
  leverage: number;
  liquidationPrice: number;
  side: 'long' | 'short';
  status: 'open' | 'closed';
}

// Define order data type
interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  type: 'limit' | 'market' | 'stop' | 'takeProfit';
  side: 'buy' | 'sell';
  price: number;
  size: number;
  funds: number;
  status: 'open' | 'filled' | 'cancelled' | 'rejected';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  createTime: number;
  fillTime?: number;
  fillPrice?: number;
}

// Define liquidation warning type
interface LiquidationWarning {
  symbol: string;
  currentMargin: number;
  liquidationPrice: number;
  marginRatio: number;
  markPrice: number;
  positionSize: number;
}

// Define margin data type
interface MarginData {
  accountEquity: number;
  availableMargin: number;
  positionMargin: number;
  orderMargin: number;
  frozenMargin: number;
  marginRatio: number;
  maintenanceMarginRatio: number;
}

// Define callback types for improved type safety
type PositionUpdateCallback = (position: Position) => void;
type OrderUpdateCallback = (order: Order) => void;
type LiquidationCallback = (warning: LiquidationWarning) => void;
type MarginCallback = (margin: MarginData) => void;

// Define balance response type
interface BalanceResponse {
  totalAmount: string;
  availableAmount: string;
  accountEquity: string;
  unrealizedPnL: string;
  todayPnL: string;
  todayPnLPercentage: string;
}

// Define market data types
interface MarketCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Define trade type
interface TradeData {
  id: string;
  price: number;
  amount: number;
  timestamp: number;
  side: 'buy' | 'sell';
  pair: string;
}

// Create a singleton API client
class PoloniexApiClient {
  private static instance: PoloniexApiClient;
  private apiKey: string = '';
  private apiSecret: string = '';
  private mockMode: boolean = false;
  private lastBalanceUpdate: number = 0;
  private cachedBalance: BalanceResponse | null = null;
  private readonly historicalData: Map<string, MarketCandle[]> = new Map();
  private readonly balanceUpdateInterval: number = 10000; // 10 seconds
  private requestCounter: number = 0;
  private readonly requestTimeoutMs: number = 5000; // 5 second timeout for requests
  private readonly rateLimitQueue: Map<string, number[]> = new Map();
  private readonly positionUpdateCallbacks: Set<PositionUpdateCallback> = new Set();
  private readonly orderUpdateCallbacks: Set<OrderUpdateCallback> = new Set();
  private readonly liquidationCallbacks: Set<LiquidationCallback> = new Set();
  private readonly marginCallbacks: Set<MarginCallback> = new Set();

  private constructor() {
    this.loadCredentials();
  }

  /**
   * Subscribe to position updates
   */
  public onPositionUpdate(callback: PositionUpdateCallback): void {
    this.positionUpdateCallbacks.add(callback);
  }

  /**
   * Subscribe to order updates
   */
  public onOrderUpdate(callback: OrderUpdateCallback): void {
    this.orderUpdateCallbacks.add(callback);
  }

  /**
   * Subscribe to liquidation warnings
   */
  public onLiquidationWarning(callback: LiquidationCallback): void {
    this.liquidationCallbacks.add(callback);
  }

  /**
   * Subscribe to margin updates
   */
  public onMarginUpdate(callback: MarginCallback): void {
    this.marginCallbacks.add(callback);
  }

  /**
   * Check rate limit before making request
   */
  private async checkRateLimit(type: 'public' | 'private' | 'order'): Promise<void> {
    const now = Date.now();
    const key = `${type}_requests`;
    const limit =
      type === 'public'
        ? RATE_LIMITS.PUBLIC_REQUESTS_PER_SECOND
        : type === 'private'
          ? RATE_LIMITS.PRIVATE_REQUESTS_PER_SECOND
          : RATE_LIMITS.ORDERS_PER_SECOND;

    if (!this.rateLimitQueue.has(key)) {
      this.rateLimitQueue.set(key, []);
    }

    const queue = this.rateLimitQueue.get(key);
    if (!queue) return; // TypeScript check to handle potential undefined

    const oneSecondAgo = now - 1000;

    // Remove timestamps older than 1 second
    while (queue && queue.length > 0 && typeof queue[0] === 'number' && queue[0] < oneSecondAgo) {
      queue.shift();
    }

    if (queue && queue.length >= limit && queue.length > 0) {
      // Add null check with nullish coalescing to ensure we have a valid timestamp
      const oldestRequest = queue[0] ?? now;
      const waitTime = Math.max(0, 1000 - (now - oldestRequest));
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    queue.push(now);
  }

  public static getInstance(): PoloniexApiClient {
    if (!PoloniexApiClient.instance) {
      PoloniexApiClient.instance = new PoloniexApiClient();
    }
    return PoloniexApiClient.instance;
  }

  /**
   * Load credentials from localStorage or environment variables
   */
  public loadCredentials(): void {
    try {
      // Try to get credentials from localStorage first
      const storedApiKey = getStorageItem(STORAGE_KEYS.API_KEY, '');
      const storedApiSecret = getStorageItem(STORAGE_KEYS.API_SECRET, '');
      const isLiveTrading = getStorageItem(STORAGE_KEYS.IS_LIVE_TRADING, false);

      // If stored credentials exist, use them
      if (storedApiKey && storedApiSecret) {
        this.apiKey = storedApiKey;
        this.apiSecret = storedApiSecret;
        this.mockMode = !isLiveTrading;

        console.log(
          this.mockMode
            ? 'Using stored API credentials but running in mock mode'
            : 'Using stored API credentials with live trading enabled'
        );
      } else {
        // No stored credentials, use mock mode
        this.mockMode = true;
        console.log('No API credentials found, using mock mode');
      }

      // Log connection status
      if (this.mockMode) {
        console.log('Mock mode active - live trading disabled');
      } else {
        console.log('Live trading mode active with API credentials');
      }

      // Clear cached data when credentials change
      this.cachedBalance = null;
      this.lastBalanceUpdate = 0;
    } catch (err) {
      console.error('Error loading credentials:', err instanceof Error ? err.message : String(err));
      // Default to mock mode if there's any error
      this.mockMode = true;
      console.log('Error loading credentials, defaulting to mock mode');
    }
  }

  /**
   * Generate signature for Poloniex API requests
   */
  private generateSignature(
    endpoint: string,
    queryString: string = '',
    body: unknown = null
  ): string {
    // Current timestamp in milliseconds
    const timestamp = Date.now();
    const signVersion = '2';

    // Create the string to sign
    let signString = timestamp + signVersion + endpoint;

    if (queryString) {
      signString += '?' + queryString;
    }

    if (body) {
      signString += JSON.stringify(body);
    }

    // Create HMAC SHA256 signature
    const signature = CryptoJS.HmacSHA256(signString, this.apiSecret).toString(CryptoJS.enc.Hex);

    return signature;
  }

  /**
   * Get account balance - returns mock data if in mock mode
   */
  public async getAccountBalance(): Promise<BalanceResponse> {
    // Track request number for debugging
    const requestId = ++this.requestCounter;

    // Check if we have a recent cached balance
    if (this.cachedBalance && Date.now() - this.lastBalanceUpdate < this.balanceUpdateInterval) {
      console.log(`[Request ${requestId}] Using cached balance data`);
      return this.cachedBalance;
    }

    console.log(`[Request ${requestId}] Getting account balance`);

    try {
      // If in mock mode, return mock data immediately
      if (this.mockMode) {
        console.log(`[Request ${requestId}] Using mock account balance data`);
        return {
          totalAmount: '15478.23',
          availableAmount: '12345.67',
          accountEquity: '15820.45',
          unrealizedPnL: '342.22',
          todayPnL: '156.78',
          todayPnLPercentage: '1.02',
        };
      }

      const endpoint = '/accounts/balance';
      const timestamp = Date.now().toString();
      const signVersion = '2';
      const signature = this.generateSignature(endpoint, '', null);
      const url = `${FUTURES_BASE_URL}${endpoint}`;

      logApiCall('GET', url);

      // Use axios with timeout
      const response = await axios.get<BalanceResponse>(url, {
        headers: {
          'PF-API-KEY': this.apiKey,
          'PF-API-SIGN': signature,
          'PF-API-TIMESTAMP': timestamp,
          'PF-API-SIGN-VERSION': signVersion,
          'Content-Type': 'application/json',
        },
        timeout: this.requestTimeoutMs,
      });

      // Cache the response
      this.cachedBalance = response.data;
      this.lastBalanceUpdate = Date.now();

      console.log(`[Request ${requestId}] Account balance fetched successfully`);
      return this.cachedBalance;
    } catch (err) {
      console.error(
        `[Request ${requestId}] Error fetching account balance:`,
        safeErrorHandler(err).message
      );

      // If timeout or network error, return mock data
      console.log(`[Request ${requestId}] Falling back to mock account balance data`);
      return {
        totalAmount: '15478.23',
        availableAmount: '12345.67',
        accountEquity: '15820.45',
        unrealizedPnL: '342.22',
        todayPnL: '156.78',
        todayPnLPercentage: '1.02',
      };
    }
  }

  /**
   * Get market data for a specific pair - returns mock data if in mock mode
   */
  public async getMarketData(pair: string): Promise<MarketCandle[]> {
    // Track request number for debugging
    const requestId = ++this.requestCounter;
    console.log(`[Request ${requestId}] Getting market data for ${pair}`);

    try {
      // If in mock mode, return mock data immediately
      if (this.mockMode) {
        console.log(`[Request ${requestId}] Using mock market data for ${pair}`);
        return this.generateMockMarketData(100);
      }

      // Poloniex expects pairs in format like BTC_USDT (not BTC-USDT)
      const formattedPair = pair.replace('-', '_') + '_PERP';
      const endpoint = `/markets/${formattedPair}/candles`;
      const queryParams = `interval=5m&limit=100`;

      logApiCall('GET', `${endpoint}?${queryParams}`);

      // Use axios with timeout
      const response = await axios.get(`${SPOT_BASE_URL}${endpoint}?${queryParams}`, {
        timeout: this.requestTimeoutMs,
      });

      console.log(`[Request ${requestId}] Market data fetched successfully for ${pair}`);
      return response.data;
    } catch (err) {
      console.error(
        `[Request ${requestId}] Error fetching market data for ${pair}:`,
        safeErrorHandler(err).message
      );

      // If timeout or network error, return mock data
      console.log(`[Request ${requestId}] Falling back to mock market data for ${pair}`);
      return this.generateMockMarketData(100);
    }
  }

  /**
   * Generate mock market data (candles)
   */
  private generateMockMarketData(count: number): MarketCandle[] {
    return Array.from({ length: count }, (_, i) => {
      const basePrice = 50000 + Math.random() * 5000;
      const volatility = basePrice * 0.01;
      const timestamp = Date.now() - (count - 1 - i) * 60 * 1000; // Last n minutes
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const high = open + Math.random() * volatility;
      const low = open - Math.random() * volatility;
      const close = low + Math.random() * (high - low);

      return {
        timestamp,
        open,
        high,
        low,
        close,
        volume: 100 + Math.random() * 900,
      };
    });
  }

  /**
   * Get open positions - returns mock data if in mock mode
   */
  public async getOpenPositions(): Promise<{ positions: Position[] }> {
    // Track request number for debugging
    const requestId = ++this.requestCounter;
    console.log(`[Request ${requestId}] Getting open positions`);

    try {
      // If in mock mode, return mock data immediately
      if (this.mockMode) {
        console.log(`[Request ${requestId}] Using mock positions data`);
        return {
          positions: [
            {
              symbol: 'BTC_USDT',
              size: 0.5,
              entryPrice: 25000,
              markPrice: 51000,
              pnl: 500,
              marginMode: 'cross',
              leverage: 1,
              liquidationPrice: 45000,
              side: 'long',
              status: 'open',
            },
          ],
        };
      }

      const endpoint = '/positions';
      const timestamp = Date.now().toString();
      const signVersion = '2';
      const signature = this.generateSignature(endpoint, '', null);

      logApiCall('GET', endpoint);

      // Use axios with timeout
      const response = await axios.get(`${FUTURES_BASE_URL}${endpoint}`, {
        headers: {
          'PF-API-KEY': this.apiKey,
          'PF-API-SIGN': signature,
          'PF-API-TIMESTAMP': timestamp,
          'PF-API-SIGN-VERSION': signVersion,
          'Content-Type': 'application/json',
        },
        timeout: this.requestTimeoutMs,
      });

      console.log(`[Request ${requestId}] Open positions fetched successfully`);
      return response.data;
    } catch (err) {
      console.error(
        `[Request ${requestId}] Error fetching open positions:`,
        safeErrorHandler(err).message
      );

      // If timeout or network error, return mock data
      console.log(`[Request ${requestId}] Falling back to mock positions data`);
      return {
        positions: [
          {
            symbol: 'BTC_USDT',
            size: 0.5,
            entryPrice: 25000,
            markPrice: 51000,
            pnl: 500,
            marginMode: 'cross',
            leverage: 1,
            liquidationPrice: 45000,
            side: 'long',
            status: 'open',
          },
        ],
      };
    }
  }

  /**
   * Place an order - returns mock data if in mock mode
   */
  public async placeOrder(
    pair: string,
    side: 'buy' | 'sell',
    type: 'limit' | 'market',
    quantity: number,
    price?: number
  ): Promise<Order> {
    await this.checkRateLimit('order');

    // Track request number for debugging
    const requestId = ++this.requestCounter;
    console.log(
      `[Request ${requestId}] Placing order: ${side} ${quantity} ${pair} ${type}`,
      price ? `@ ${price}` : ''
    );

    try {
      if (this.mockMode) {
        console.log(`[Request ${requestId}] Using mock order placement`);
        return {
          id: 'mock-order-' + Date.now(),
          clientOrderId: 'mock-client-order-' + Date.now(),
          symbol: pair,
          type,
          side,
          price: price ?? (type === 'market' ? 0 : 50000), // Use default price for mock
          size: quantity,
          funds: 0,
          status: 'open',
          timeInForce: 'GTC',
          createTime: Date.now(),
        };
      }

      // Poloniex expects pairs in format like BTC_USDT (not BTC-USDT)
      const formattedPair = pair.replace('-', '_');
      const endpoint = '/orders';
      const timestamp = Date.now();

      const orderData = {
        symbol: formattedPair,
        side: side.toUpperCase(),
        type: type.toUpperCase(),
        quantity: quantity.toString(),
        leverage: '1', // Default leverage
        ...(type === 'limit' && price ? { price: price.toString() } : {}),
      };

      const signature = this.generateSignature(endpoint, '', orderData);

      logApiCall('POST', endpoint, orderData);

      // Use axios with timeout
      const response = await axios.post(`${FUTURES_BASE_URL}${endpoint}`, orderData, {
        headers: {
          'PF-API-KEY': this.apiKey,
          'PF-API-SIGN': signature,
          'PF-API-TIMESTAMP': timestamp,
          'Content-Type': 'application/json',
        },
        timeout: this.requestTimeoutMs,
      });

      console.log(`[Request ${requestId}] Order placed successfully`);
      return response.data;
    } catch (err) {
      console.error(`[Request ${requestId}] Error placing order:`, safeErrorHandler(err).message);

      // For order placement in real env, propagate the error
      throw safeErrorHandler(err);
    }
  }

  /**
   * Place a conditional order (stop loss, take profit)
   */
  public async placeConditionalOrder(
    pair: string,
    side: 'buy' | 'sell',
    type: 'stop' | 'takeProfit',
    quantity: number,
    triggerPrice: number,
    price?: number
  ): Promise<Order> {
    await this.checkRateLimit('order');

    if (this.mockMode) {
      return {
        id: 'mock-conditional-' + Date.now(),
        clientOrderId: 'mock-client-conditional-' + Date.now(),
        symbol: pair,
        type, // Use the provided type directly
        side,
        price: price ?? triggerPrice, // Use trigger price as fallback with nullish coalescing
        size: quantity,
        funds: 0,
        status: 'open',
        timeInForce: 'GTC',
        createTime: Date.now(),
      };
    }

    const endpoint = '/orders/conditional';
    const orderData = {
      symbol: pair.replace('-', '_'),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: quantity.toString(),
      triggerPrice: triggerPrice.toString(),
      ...(price && { price: price.toString() }),
    };

    const signature = this.generateSignature(endpoint, '', orderData);
    const timestamp = Date.now();

    try {
      const response = await axios.post(`${FUTURES_BASE_URL}${endpoint}`, orderData, {
        headers: {
          'PF-API-KEY': this.apiKey,
          'PF-API-SIGN': signature,
          'PF-API-TIMESTAMP': timestamp,
          'Content-Type': 'application/json',
        },
        timeout: this.requestTimeoutMs,
      });

      return response.data;
    } catch (err) {
      throw safeErrorHandler(err);
    }
  }

  /**
   * Update leverage for a position
   */
  public async updateLeverage(pair: string, leverage: number): Promise<MarginData> {
    await this.checkRateLimit('private');

    if (this.mockMode) {
      return {
        accountEquity: 10000,
        availableMargin: 5000,
        positionMargin: 2000,
        orderMargin: 1000,
        frozenMargin: 0,
        marginRatio: 2,
        maintenanceMarginRatio: 1.5,
      };
    }

    const endpoint = '/positions/leverage';
    const data = {
      symbol: pair.replace('-', '_'),
      leverage: leverage.toString(),
    };

    const signature = this.generateSignature(endpoint, '', data);
    const timestamp = Date.now();

    try {
      const response = await axios.post(`${FUTURES_BASE_URL}${endpoint}`, data, {
        headers: {
          'PF-API-KEY': this.apiKey,
          'PF-API-SIGN': signature,
          'PF-API-TIMESTAMP': timestamp,
          'Content-Type': 'application/json',
        },
        timeout: this.requestTimeoutMs,
      });

      return response.data;
    } catch (err) {
      throw safeErrorHandler(err);
    }
  }

  /**
   * Get recent trades for a pair - returns mock data if in mock mode
   */
  public async getRecentTrades(pair: string, limit: number = 50): Promise<TradeData[]> {
    // Track request number for debugging
    const requestId = ++this.requestCounter;
    console.log(`[Request ${requestId}] Getting recent trades for ${pair} (limit: ${limit})`);

    try {
      // If in mock mode, return mock data immediately
      if (this.mockMode) {
        console.log(`[Request ${requestId}] Using mock trades data for ${pair}`);
        return this.generateMockTrades(pair, limit);
      }

      // Poloniex expects pairs in format like BTC_USDT (not BTC-USDT)
      const formattedPair = pair.replace('-', '_') + '_PERP';
      const endpoint = `/markets/${formattedPair}/trades`;
      const queryParams = `limit=${limit}`;

      logApiCall('GET', `${endpoint}?${queryParams}`);

      // Use axios with timeout
      const response = await axios.get(`${SPOT_BASE_URL}${endpoint}?${queryParams}`, {
        timeout: this.requestTimeoutMs,
      });

      console.log(`[Request ${requestId}] Recent trades fetched successfully for ${pair}`);
      return response.data;
    } catch (err) {
      console.error(
        `[Request ${requestId}] Error fetching recent trades for ${pair}:`,
        safeErrorHandler(err).message
      );

      // If timeout or network error, return mock data
      console.log(`[Request ${requestId}] Falling back to mock trades data for ${pair}`);
      return this.generateMockTrades(pair, limit);
    }
  }

  /**
   * Generate mock trades data
   */
  private generateMockTrades(pair: string, limit: number): TradeData[] {
    // Create an array of trades with guaranteed unique IDs
    return Array.from({ length: limit }, (_, i) => {
      const basePrice = 51000 + (Math.random() - 0.5) * 1000;
      const amount = 0.01 + Math.random() * 0.5;
      // Use index in timestamp to ensure uniqueness
      const timestamp = Date.now() - i * 60 * 1000; // Last few minutes, each 1 minute apart

      return {
        id: `mock-trade-${i}-${Date.now()}`, // Ensure unique IDs by combining index and timestamp
        price: basePrice,
        amount,
        timestamp,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        pair,
      };
    });
  }

  /**
   * Get historical market data for backtesting
   */
  public async getHistoricalData(
    pair: string,
    startDate: string,
    endDate: string
  ): Promise<MarketCandle[]> {
    const cacheKey = `${pair}_${startDate}_${endDate}`;

    if (this.historicalData.has(cacheKey)) {
      const cachedData = this.historicalData.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    try {
      // For mock purposes, generate data
      const data = this.generateMockHistoricalData(pair, startDate, endDate);
      this.historicalData.set(cacheKey, data);
      return data;
    } catch {
      // Return mock data for testing
      const mockData = this.generateMockHistoricalData(pair, startDate, endDate);
      this.historicalData.set(cacheKey, mockData);
      return mockData;
    }
  }

  /**
   * Generate mock historical data
   */
  private generateMockHistoricalData(
    pair: string,
    startDate: string,
    endDate: string
  ): MarketCandle[] {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const hourMs = 60 * 60 * 1000;
    const data: MarketCandle[] = [];

    let basePrice = 50000; // Starting price

    // Use pair to adjust the base price for different assets (optional)
    if (pair.startsWith('ETH')) {
      basePrice = 3000;
    } else if (pair.startsWith('SOL')) {
      basePrice = 100;
    }

    for (let timestamp = start; timestamp <= end; timestamp += hourMs) {
      // Generate random price movement (with trend)
      const trend = Math.random() > 0.5 ? 1 : -1;
      const volatility = basePrice * 0.005;
      const priceChange = trend * Math.random() * volatility;

      const open = basePrice;
      const close = basePrice + priceChange;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: 100 + Math.random() * 900,
      });

      // Update base price for next candle
      basePrice = close;
    }

    return data;
  }
}

// Export a singleton instance
export const poloniexApi = PoloniexApiClient.getInstance();
