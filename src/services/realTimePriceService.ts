import { Subject, Observable } from 'rxjs';
import { webSocketService } from './websocketService';
import { poloniexApi } from './poloniexAPI';
import { logger } from '../utils/logger';

export interface PriceUpdate {
  pair: string;
  price: number;
  timestamp: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface PriceAlert {
  id: string;
  pair: string;
  condition: 'above' | 'below';
  price: number;
  triggered: boolean;
  createdAt: number;
}

/**
 * Real-time price service for managing price streams and alerts
 */
export class RealTimePriceService {
  private static instance: RealTimePriceService;
  private priceStreams: Map<string, Subject<PriceUpdate>> = new Map();
  private priceAlerts: Map<string, PriceAlert> = new Map();
  private lastPrices: Map<string, PriceUpdate> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize price checking interval
    this.checkInterval = setInterval(() => this.checkPriceAlerts(), 5000);

    // Subscribe to websocket market data
    webSocketService.on('marketData', (data: any) => {
      if (data && data.pair) {
        this.updatePrice(data.pair, data);
      }
    });

    // Listen for market data updates from poloniexAPI
    if (typeof window !== 'undefined') {
      window.addEventListener('market-data-updated', ((event: CustomEvent) => {
        const { pair, data } = event.detail;
        if (pair && data) {
          this.updatePrice(pair, {
            pair,
            price: data.close,
            timestamp: data.timestamp,
            high: data.high,
            low: data.low,
            open: data.open,
            volume: data.volume,
          });
        }
      }) as EventListener);
    }
  }

  public static getInstance(): RealTimePriceService {
    if (!RealTimePriceService.instance) {
      RealTimePriceService.instance = new RealTimePriceService();
    }
    return RealTimePriceService.instance;
  }

  /**
   * Subscribe to real-time price updates for a specific pair
   * @param pair Trading pair (e.g., 'BTC-USDT')
   * @param interval Update interval
   * @returns Observable of price updates
   */
  public subscribeToPrice(
    pair: string,
    interval: '1s' | '5s' | '1m' = '1s'
  ): Observable<PriceUpdate> {
    // Create a new subject if it doesn't exist
    if (!this.priceStreams.has(pair)) {
      this.priceStreams.set(pair, new Subject<PriceUpdate>());

      // Subscribe to the pair via websocket
      webSocketService.subscribeToMarket(pair);

      // Initialize with current price - using an event instead of direct API call
      // to avoid circular dependency
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('price-subscription-request', {
            detail: { pair },
          })
        );
      }
    }

    // Set up polling based on interval if needed
    const intervalMs = interval === '1s' ? 1000 : interval === '5s' ? 5000 : 60000; // 1m

    // For faster intervals than the default websocket provides,
    // we'll emit a polling request event
    if (intervalMs < 5000) {
      const pollingInterval = setInterval(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('price-polling-request', {
              detail: { pair },
            })
          );
        }
      }, intervalMs);

      // Store the interval reference for cleanup
      // This would need to be cleaned up when unsubscribing
    }

    return this.priceStreams.get(pair)!.asObservable();
  }

  /**
   * Set a price alert for a specific pair
   * @param pair Trading pair
   * @param condition Alert condition (above or below)
   * @param price Target price
   * @returns Alert ID
   */
  public setPriceAlert(pair: string, condition: 'above' | 'below', price: number): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const alert: PriceAlert = {
      id,
      pair,
      condition,
      price,
      triggered: false,
      createdAt: Date.now(),
    };

    this.priceAlerts.set(id, alert);
    logger.info(`Price alert set for ${pair} ${condition} ${price}`);

    // Make sure we're subscribed to this pair
    if (!this.priceStreams.has(pair)) {
      this.subscribeToPrice(pair);
    }

    return id;
  }

  /**
   * Remove a price alert by ID
   * @param id Alert ID
   * @returns Success status
   */
  public removePriceAlert(id: string): boolean {
    const result = this.priceAlerts.delete(id);
    if (result) {
      logger.info(`Price alert ${id} removed`);
    }
    return result;
  }

  /**
   * Get all active price alerts
   * @returns Array of price alerts
   */
  public getActiveAlerts(): PriceAlert[] {
    return Array.from(this.priceAlerts.values()).filter(alert => !alert.triggered);
  }

  /**
   * Get the latest price for a pair
   * @param pair Trading pair
   * @returns Latest price update or null
   */
  public getLatestPrice(pair: string): PriceUpdate | null {
    return this.lastPrices.get(pair) || null;
  }

  /**
   * Fetch initial price for a pair
   * This method is kept for interface completeness but
   * actual fetching is handled through events now
   * @param pair Trading pair
   */
  private async fetchInitialPrice(pair: string): Promise<void> {
    // We don't directly fetch here anymore to avoid circular dependencies
    // Instead, we dispatch an event that will be handled elsewhere
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('price-subscription-request', {
          detail: { pair },
        })
      );
    }
  }

  /**
   * Update price and notify subscribers
   * @param pair Trading pair
   * @param update Price update data
   */
  private updatePrice(pair: string, update: PriceUpdate): void {
    // Store the latest price
    this.lastPrices.set(pair, update);

    // Notify subscribers
    const subject = this.priceStreams.get(pair);
    if (subject) {
      subject.next(update);
    }
  }

  /**
   * Check for triggered price alerts
   */
  private checkPriceAlerts(): void {
    for (const [id, alert] of this.priceAlerts.entries()) {
      if (alert.triggered) continue;

      const latestPrice = this.lastPrices.get(alert.pair);
      if (!latestPrice) continue;

      let isTriggered = false;

      if (alert.condition === 'above' && latestPrice.price >= alert.price) {
        isTriggered = true;
      } else if (alert.condition === 'below' && latestPrice.price <= alert.price) {
        isTriggered = true;
      }

      if (isTriggered) {
        // Mark as triggered
        alert.triggered = true;
        this.priceAlerts.set(id, alert);

        // Log the alert
        logger.info(`Price alert triggered: ${alert.pair} ${alert.condition} ${alert.price}`);

        // Dispatch event for UI notification
        const event = new CustomEvent('priceAlertTriggered', {
          detail: {
            alert,
            currentPrice: latestPrice.price,
          },
        });
        window.dispatchEvent(event);
      }
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Close all subjects
    for (const subject of this.priceStreams.values()) {
      subject.complete();
    }

    this.priceStreams.clear();
    this.priceAlerts.clear();
    this.lastPrices.clear();
  }
}

// Export singleton instance
export const realTimePriceService = RealTimePriceService.getInstance();
