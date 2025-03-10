/**
 * Poloniex API Client
 *
 * A type-safe client for interacting with the Poloniex API.
 * Implements comprehensive error handling, retries, and authentication.
 */
import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import CryptoJS from 'crypto-js';
import { ENV_CONFIG } from '@/utils/environment';
import type {
  ApiResponse,
  Market,
  MarketSummary,
  Currency,
  Candle,
  TimeInterval,
  Order,
  CreateOrderParams,
  Trade,
  Account,
} from './types';

/**
 * API request methods
 */
type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PUT';

/**
 * Configuration for the Poloniex API client
 */
interface PoloniexClientConfig {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<PoloniexClientConfig> = {
  apiKey: '',
  apiSecret: '',
  baseUrl: ENV_CONFIG.poloniexApiUrl,
  timeout: 30000,
  maxRetries: 3,
};

/**
 * API Error handling wrapper
 */
export class PoloniexApiError extends Error {
  public readonly status?: number;
  public readonly data?: unknown;
  public readonly method: HttpMethod;
  public readonly url: string;
  public readonly isTimeout: boolean;
  public readonly isNetworkError: boolean;

  constructor(message: string, error: AxiosError, method: HttpMethod, url: string) {
    super(message);
    this.name = 'PoloniexApiError';
    this.status = error.response?.status;
    this.data = error.response?.data;
    this.method = method;
    this.url = url;
    this.isTimeout = error.code === 'ECONNABORTED';
    this.isNetworkError = error.message.includes('Network Error');
  }
}

/**
 * Poloniex API Client implementation
 */
export class PoloniexClient {
  private readonly axios: AxiosInstance;
  private readonly config: Required<PoloniexClientConfig>;

  /**
   * Creates a new Poloniex API client instance
   */
  constructor(config: PoloniexClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Set up request interceptors
    this.setupInterceptors();
  }

  /**
   * Configure Axios interceptors for request/response handling
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.axios.interceptors.request.use(config => {
      if (this.config.apiKey && this.config.apiSecret) {
        const timestamp = Date.now().toString();

        // Add auth headers to config
        config.headers = config.headers || {};
        config.headers['POLONEIX-API-KEY'] = this.config.apiKey;
        config.headers['POLONEIX-API-TIMESTAMP'] = timestamp;

        // Generate signature
        if (config.method && config.url) {
          const method = config.method.toUpperCase();
          const path = config.url.replace(/^\/+/, '');
          const body = config.data ? JSON.stringify(config.data) : '';

          const message = `${timestamp}${method}/${path}${body}`;
          const signature = CryptoJS.HmacSHA256(message, this.config.apiSecret).toString(
            CryptoJS.enc.Hex
          );

          config.headers['POLONEIX-API-SIGNATURE'] = signature;
        }
      }
      return config;
    });
  }

  /**
   * Execute a request with retry functionality
   */
  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: unknown,
    config: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    let retries = 0;
    const maxRetries = this.config.maxRetries;
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    while (retries <= maxRetries) {
      try {
        const requestConfig: AxiosRequestConfig = {
          ...config,
          method,
          url,
          data: method !== 'GET' ? data : undefined,
          params: method === 'GET' ? data : undefined,
        };

        const response = await this.axios.request<ApiResponse<T>>(requestConfig);
        return response.data;
      } catch (error) {
        const isRetryableError =
          error instanceof AxiosError &&
          (error.code === 'ECONNABORTED' || // Timeout
            error.message.includes('Network Error') || // Network error
            [408, 429, 500, 502, 503, 504].includes(error.response?.status ?? 0)); // Retryable status

        if (isRetryableError && retries < maxRetries) {
          retries++;
          // Exponential backoff with jitter
          const delay = Math.min(1000 * 2 ** retries, 10000) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (error instanceof AxiosError) {
          throw new PoloniexApiError(error.message, error, method, endpoint);
        }

        throw error;
      }
    }

    // This line should never be reached due to the while loop condition,
    // but TypeScript requires a return statement
    throw new Error('Maximum retry attempts exceeded');
  }

  // Public API endpoints

  /**
   * Get all available markets
   */
  public async getMarkets(): Promise<ApiResponse<Market[]>> {
    return this.request<Market[]>('GET', '/markets');
  }

  /**
   * Get market summaries
   */
  public async getMarketSummaries(symbols?: string[]): Promise<ApiResponse<MarketSummary[]>> {
    const params = symbols ? { symbols: symbols.join(',') } : undefined;
    return this.request<MarketSummary[]>('GET', '/markets/summaries', params);
  }

  /**
   * Get candle data for a market
   */
  public async getCandles(
    symbol: string,
    interval: TimeInterval,
    limit?: number,
    startTime?: number,
    endTime?: number
  ): Promise<ApiResponse<Candle[]>> {
    return this.request<Candle[]>('GET', '/markets/candles', {
      symbol,
      interval,
      limit,
      startTime,
      endTime,
    });
  }

  /**
   * Get information about supported currencies
   */
  public async getCurrencies(): Promise<ApiResponse<Currency[]>> {
    return this.request<Currency[]>('GET', '/currencies');
  }

  // Private API endpoints (requires authentication)

  /**
   * Get account information
   */
  public async getAccounts(): Promise<ApiResponse<Account[]>> {
    return this.request<Account[]>('GET', '/accounts');
  }

  /**
   * Create a new order
   */
  public async createOrder(params: CreateOrderParams): Promise<ApiResponse<Order>> {
    return this.request<Order>('POST', '/orders', params);
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request<Order>('DELETE', `/orders/${orderId}`);
  }

  /**
   * Get order information
   */
  public async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request<Order>('GET', `/orders/${orderId}`);
  }

  /**
   * Get open orders
   */
  public async getOpenOrders(symbol?: string): Promise<ApiResponse<Order[]>> {
    const params = symbol ? { symbol } : undefined;
    return this.request<Order[]>('GET', '/orders', params);
  }

  /**
   * Get trade history
   */
  public async getTradeHistory(
    symbol?: string,
    orderId?: string,
    limit?: number,
    startTime?: number,
    endTime?: number
  ): Promise<ApiResponse<Trade[]>> {
    return this.request<Trade[]>('GET', '/trades', {
      symbol,
      orderId,
      limit,
      startTime,
      endTime,
    });
  }
}
