import { io, Socket } from 'socket.io-client';
import type { MarketData, Trade } from '../types';
import { ENV } from '../config/constants';

// Socket.io events
const EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MARKET_DATA: 'marketData',
  TRADE_EXECUTED: 'tradeExecuted',
  CHAT_MESSAGE: 'chatMessage',
  ERROR: 'error',
  SUBSCRIBE_MARKET: 'subscribeMarket',
  UNSUBSCRIBE_MARKET: 'unsubscribeMarket',
};

interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private connected: boolean = false;
  private readonly eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 1000;
  private offlineData: Map<string, unknown> = new Map();
  private connectionAttempted: boolean = false;
  private useMockData: boolean = ENV.MOCK_MODE; // Use the environment variable

  // In a real application, this would be your WebSocket server URL
  private readonly SOCKET_URL = 'http://localhost:8765';

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(token?: string): Promise<void> {
    return new Promise(resolve => {
      try {
        // Reset reconnect attempts on new connection
        this.reconnectAttempts = 0;

        // If we already attempted to connect and failed, don't retry
        if (this.connectionAttempted) {
          console.log('Using mock data (previous connection attempt failed)');
          this.useMockData = true;
          resolve();
          return;
        }

        this.connectionAttempted = true;
        console.log('Attempting WebSocket connection with 3s timeout...');

        // Set a connection timeout
        const timeout = setTimeout(() => {
          console.log('WebSocket connection timed out, using mock data');
          this.useMockData = true;
          resolve();
        }, 3000);

        // In WebContainer environment, always use mock data
        // WebSocket connections outside the container domain aren't possible
        if (
          typeof window !== 'undefined' &&
          window.location?.hostname?.includes('webcontainer-api.io')
        ) {
          this.useMockData = true;
          clearTimeout(timeout);
          console.log('Running in WebContainer environment, defaulting to mock data');
          resolve();
          return;
        }

        // Check if server is available before attempting socket connection
        fetch(this.SOCKET_URL + '/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(2000), // 2s timeout for the health check
        })
          .then(response => {
            if (!response.ok) throw new Error('Server health check failed');
            return response.json();
          })
          .then(() => {
            // Server is available, attempt WebSocket connection
            clearTimeout(timeout);

            this.socket = io(this.SOCKET_URL, {
              auth: token ? { token } : {},
              transports: ['websocket'],
              reconnection: true,
              reconnectionAttempts: 2,
              reconnectionDelay: 1000,
              timeout: 2000,
            });

            this.socket.on(EVENTS.CONNECT, () => {
              console.log('WebSocket connected successfully');
              this.connected = true;
              this.useMockData = false;
              resolve();
            });

            this.socket.on(EVENTS.DISCONNECT, () => {
              console.log('WebSocket disconnected, falling back to mock data');
              this.handleDisconnect();
              this.connected = false;
              this.useMockData = true;
            });

            this.socket.on(EVENTS.ERROR, error => {
              console.error(
                'WebSocket error:',
                typeof error === 'object' ? JSON.stringify(error) : error
              );
              this.useMockData = true;
            });

            // Set up message handlers
            this.setupMessageHandlers();
          })
          .catch(error => {
            // Server is not available, use mock data
            clearTimeout(timeout);
            console.log('Server not available, using mock data:', error.message);
            this.useMockData = true;
            resolve();
          });
      } catch (error) {
        console.error(
          'WebSocket connection error:',
          error instanceof Error ? error.message : String(error)
        );
        this.useMockData = true;
        resolve();
      }
    });
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Check if we're using mock data
   */
  public isMockMode(): boolean {
    return this.useMockData;
  }

  /**
   * Set up message handlers for different types of events
   */
  private setupMessageHandlers(): void {
    if (!this.socket) return;

    // Handle market data updates
    this.socket.on(EVENTS.MARKET_DATA, (data: MarketData) => {
      this.notifyListeners(EVENTS.MARKET_DATA, data);
    });

    // Handle trade execution notifications
    this.socket.on(EVENTS.TRADE_EXECUTED, (data: Trade) => {
      this.notifyListeners(EVENTS.TRADE_EXECUTED, data);
    });

    // Handle chat messages
    this.socket.on(EVENTS.CHAT_MESSAGE, (data: ChatMessage) => {
      this.notifyListeners(EVENTS.CHAT_MESSAGE, data);
    });
  }

  /**
   * Handle WebSocket disconnection with reconnect logic
   */
  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
      );

      setTimeout(() => {
        this.connect()
          .then(() => {
            if (this.connected) {
              console.log('Reconnected successfully');
              this.reconnectAttempts = 0;
            }
          })
          .catch(() => {
            console.log('Reconnect attempt failed');
          });
      }, delay);
    } else {
      console.log('Max reconnection attempts reached, staying in mock mode');
    }
  }

  /**
   * Save data for offline access
   */
  private saveOfflineData(key: string, data: unknown): void {
    try {
      this.offlineData.set(key, data);
      localStorage.setItem(
        'websocket_offline_data',
        JSON.stringify(Array.from(this.offlineData.entries()))
      );
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  /**
   * Subscribe to market data for a specific pair
   */
  public subscribeToMarket(pair: string): void {
    if (!this.connected || !this.socket) {
      console.log('WebSocket not connected, skipping market subscription');
      // Try to load offline data
      const offlineData = this.offlineData.get(`market_${pair}`);
      if (offlineData) {
        this.notifyListeners(EVENTS.MARKET_DATA, offlineData);
      }
      return;
    }

    this.socket.emit(EVENTS.SUBSCRIBE_MARKET, { pair });
  }

  /**
   * Unsubscribe from market data for a specific pair
   */
  public unsubscribeFromMarket(pair: string): void {
    if (!this.connected || !this.socket) {
      return;
    }

    this.socket.emit(EVENTS.UNSUBSCRIBE_MARKET, { pair });
  }

  /**
   * Send a chat message
   */
  public sendChatMessage(message: string, username: string): void {
    if (!this.connected || !this.socket) {
      console.log('WebSocket not connected, chat message not sent');
      return;
    }

    this.socket.emit(EVENTS.CHAT_MESSAGE, {
      message,
      username,
      timestamp: Date.now(),
    });
  }

  /**
   * Register an event listener
   */
  public on(event: string, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)?.add(callback);
  }

  /**
   * Remove an event listener
   */
  public off(event: string, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) return;

    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Notify all listeners for a specific event
   */
  private notifyListeners(event: string, data: unknown): void {
    if (!this.eventListeners.has(event)) return;

    // Save data for offline access
    this.saveOfflineData(event, data);

    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `Error in ${event} event listener:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Send market data to other connected clients
   * This is primarily for testing without a backend
   */
  public broadcastMarketData(data: MarketData): void {
    if (this.useMockData) {
      // When in mock mode, simulate receiving the data from server
      setTimeout(() => {
        this.notifyListeners(EVENTS.MARKET_DATA, data);
      }, 100);
    } else if (this.connected && this.socket) {
      // When connected to real server, emit the data
      this.socket.emit(EVENTS.MARKET_DATA, data);
    }
  }

  /**
   * Send trade data to other connected clients
   * This is primarily for testing without a backend
   */
  public broadcastTradeExecuted(data: Trade): void {
    if (this.useMockData) {
      // When in mock mode, simulate receiving the data from server
      setTimeout(() => {
        this.notifyListeners(EVENTS.TRADE_EXECUTED, data);
      }, 100);
    } else if (this.connected && this.socket) {
      // When connected to real server, emit the data
      this.socket.emit(EVENTS.TRADE_EXECUTED, data);
    }
  }
}

// Export a singleton instance
export const webSocketService = WebSocketService.getInstance();
