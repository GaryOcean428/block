/**
 * WebSocket Client for Poloniex Trading Platform
 *
 * Provides real-time market data, order updates, and account information
 * using WebSockets for low-latency communication.
 */
import { ENV_CONFIG } from '@/utils/environment';
import { WebSocketMessageType, TimeInterval } from './types';
import type { WebSocketSubscription, MarketSummary, Trade, Candle, Order, Balance } from './types';

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error',
}

/**
 * WebSocket event handlers
 */
export interface WebSocketEventHandlers {
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Event) => void;
  onMarketData?: (data: MarketSummary) => void;
  onTrade?: (data: Trade) => void;
  onCandle?: (data: Candle) => void;
  onOrderUpdate?: (data: Order) => void;
  onBalanceUpdate?: (data: Balance) => void;
  onMessage?: (message: unknown) => void; // Generic message handler
}

/**
 * WebSocket client configuration
 */
export interface WebSocketClientConfig {
  url?: string;
  apiKey?: string;
  apiSecret?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Default WebSocket client configuration
 */
const DEFAULT_CONFIG: Required<WebSocketClientConfig> = {
  url: ENV_CONFIG.websocketUrl,
  apiKey: '',
  apiSecret: '',
  autoReconnect: true,
  reconnectInterval: 2000,
  maxReconnectAttempts: 5,
};

/**
 * WebSocket client for Poloniex API
 */
export class PoloniexWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketClientConfig>;
  private reconnectCount = 0;
  private subscriptions: WebSocketSubscription[] = [];
  private handlers: WebSocketEventHandlers = {};
  private connectionState: ConnectionState = ConnectionState.CLOSED;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Create a new WebSocket client instance
   */
  constructor(handlers: WebSocketEventHandlers = {}, config: WebSocketClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = handlers;
  }

  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      console.warn('WebSocket already connected or connecting');
      return;
    }

    try {
      this.connectionState = ConnectionState.CONNECTING;
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onclose = event => this.handleClose(event);
      this.ws.onerror = event => this.handleError(event);
      this.ws.onmessage = event => this.handleMessage(event);
    } catch (error) {
      this.connectionState = ConnectionState.ERROR;
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (!this.ws) return;

    this.connectionState = ConnectionState.CLOSING;
    this.clearReconnectTimer();

    try {
      this.ws.close();
    } catch (error) {
      console.error('Error closing WebSocket connection:', error);
    }

    this.ws = null;
    this.reconnectCount = 0;
  }

  /**
   * Subscribe to market data for specific symbols
   */
  public subscribeToMarketData(symbols: string[]): void {
    const subscription: WebSocketSubscription = {
      type: WebSocketMessageType.MARKET_DATA,
      symbols,
    };

    this.subscribe(subscription);
  }

  /**
   * Subscribe to candle data for a specific symbol and interval
   */
  public subscribeToCandles(symbol: string, interval: TimeInterval): void {
    const subscription: WebSocketSubscription = {
      type: WebSocketMessageType.CANDLES,
      symbols: [symbol],
      interval,
    };

    this.subscribe(subscription);
  }

  /**
   * Subscribe to trade data for specific symbols
   */
  public subscribeToTrades(symbols: string[]): void {
    const subscription: WebSocketSubscription = {
      type: WebSocketMessageType.TRADES,
      symbols,
    };

    this.subscribe(subscription);
  }

  /**
   * Subscribe to order updates (requires authentication)
   */
  public subscribeToOrderUpdates(): void {
    const subscription: WebSocketSubscription = {
      type: WebSocketMessageType.ORDER_UPDATE,
    };

    this.subscribe(subscription);
  }

  /**
   * Subscribe to balance updates (requires authentication)
   */
  public subscribeToBalanceUpdates(): void {
    const subscription: WebSocketSubscription = {
      type: WebSocketMessageType.BALANCE_UPDATE,
    };

    this.subscribe(subscription);
  }

  /**
   * Unsubscribe from a specific channel
   */
  public unsubscribe(type: WebSocketMessageType, symbols?: string[]): void {
    const unsubscription: WebSocketSubscription = {
      type: WebSocketMessageType.UNSUBSCRIBE,
      symbols: symbols ? [...symbols] : undefined,
    };

    this.send(unsubscription);

    // Remove from local subscriptions list
    this.subscriptions = this.subscriptions.filter(sub => {
      if (sub.type !== type) return true;
      if (!symbols) return false;

      // If specific symbols are provided, only remove those
      if (sub.symbols && symbols) {
        const remainingSymbols = sub.symbols.filter(sym => !symbols.includes(sym));
        if (remainingSymbols.length > 0) {
          sub.symbols = remainingSymbols;
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Update event handlers
   */
  public updateHandlers(handlers: Partial<WebSocketEventHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Send a message to the WebSocket server
   */
  private send(data: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket is not open');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Subscribe to a channel
   */
  private subscribe(subscription: WebSocketSubscription): void {
    // Store locally for reconnection
    const existingSubIndex = this.subscriptions.findIndex(sub => sub.type === subscription.type);

    if (existingSubIndex >= 0) {
      // Merge symbols for existing subscription type
      if (subscription.symbols && this.subscriptions[existingSubIndex].symbols) {
        const currentSymbols = this.subscriptions[existingSubIndex].symbols || [];
        const newSymbols = subscription.symbols || [];

        this.subscriptions[existingSubIndex].symbols = [
          ...new Set([...currentSymbols, ...newSymbols]),
        ];
      }
    } else {
      this.subscriptions.push(subscription);
    }

    // Send subscription message
    const subMessage = {
      ...subscription,
      type: WebSocketMessageType.SUBSCRIBE,
    };

    this.send(subMessage);
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.connectionState = ConnectionState.OPEN;
    this.reconnectCount = 0;

    // Resubscribe to all previous subscriptions
    this.resubscribeAll();

    // Call user handler
    if (this.handlers.onOpen) {
      this.handlers.onOpen();
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.connectionState = ConnectionState.CLOSED;

    // Call user handler
    if (this.handlers.onClose) {
      this.handlers.onClose(event.code, event.reason);
    }

    this.attemptReconnect();
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    this.connectionState = ConnectionState.ERROR;

    // Call user handler
    if (this.handlers.onError) {
      this.handlers.onError(event);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      // Route message to appropriate handler
      if (message.type) {
        switch (message.type) {
          case WebSocketMessageType.MARKET_DATA:
            if (this.handlers.onMarketData && message.data) {
              this.handlers.onMarketData(message.data);
            }
            break;

          case WebSocketMessageType.TRADES:
            if (this.handlers.onTrade && message.data) {
              this.handlers.onTrade(message.data);
            }
            break;

          case WebSocketMessageType.CANDLES:
            if (this.handlers.onCandle && message.data) {
              this.handlers.onCandle(message.data);
            }
            break;

          case WebSocketMessageType.ORDER_UPDATE:
            if (this.handlers.onOrderUpdate && message.data) {
              this.handlers.onOrderUpdate(message.data);
            }
            break;

          case WebSocketMessageType.BALANCE_UPDATE:
            if (this.handlers.onBalanceUpdate && message.data) {
              this.handlers.onBalanceUpdate(message.data);
            }
            break;
        }
      }

      // Call generic message handler if provided
      if (this.handlers.onMessage) {
        this.handlers.onMessage(message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (
      !this.config.autoReconnect ||
      this.reconnectCount >= this.config.maxReconnectAttempts ||
      this.connectionState === ConnectionState.CONNECTING
    ) {
      return;
    }

    this.clearReconnectTimer();

    // Implement exponential backoff for reconnection attempts
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, this.reconnectCount),
      30000 // Maximum 30 second delay
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectCount++;
      this.connect();
    }, delay);
  }

  /**
   * Clear the reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Resubscribe to all previous subscriptions after reconnection
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach(subscription => {
      const subMessage = {
        ...subscription,
        type: WebSocketMessageType.SUBSCRIBE,
      };

      this.send(subMessage);
    });
  }
}
