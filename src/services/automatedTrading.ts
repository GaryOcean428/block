import type { Strategy } from '../types';
import { executeStrategy } from '../utils/strategyExecutors';
import { poloniexApi } from './poloniexAPI';
import { logger } from '../utils/logger';

interface AutomatedTradingConfig {
  maxPositions: number;
  maxLeverage: number;
  riskPerTrade: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent?: number;
}

// Interface matching the Poloniex API response for positions
interface Position {
  symbol: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  type: 'long' | 'short';
  status: 'open' | 'closed';
}

// Interface matching the Poloniex API response for balance
interface BalanceResponse {
  totalAmount: string;
  availableAmount: string;
  accountEquity: string;
  unrealizedPnL: string;
  todayPnL: string;
  todayPnLPercentage: string;
}

// Interface for liquidation warnings
interface LiquidationWarning {
  symbol: string;
  markPrice: number;
  liquidationPrice: number;
  marginRatio: number;
}

class AutomatedTradingService {
  private static instance: AutomatedTradingService;
  private readonly activeStrategies: Map<string, Strategy> = new Map();
  private readonly positions: Map<string, Position> = new Map();
  private config: AutomatedTradingConfig;
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Default configuration
    this.config = {
      maxPositions: 3,
      maxLeverage: 5,
      riskPerTrade: 2, // Percentage of account balance
      stopLossPercent: 2,
      takeProfitPercent: 4,
    };

    // Subscribe to position updates
    poloniexApi.onPositionUpdate(this.handlePositionUpdate.bind(this));
    poloniexApi.onLiquidationWarning(this.handleLiquidationWarning.bind(this));
    poloniexApi.onMarginUpdate(this.handleMarginUpdate.bind(this));
  }

  public static getInstance(): AutomatedTradingService {
    if (!AutomatedTradingService.instance) {
      AutomatedTradingService.instance = new AutomatedTradingService();
    }
    return AutomatedTradingService.instance;
  }

  /**
   * Start automated trading
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateInterval = setInterval(this.update.bind(this), 5000);
    logger.info('Automated trading started');
  }

  /**
   * Stop automated trading
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    logger.info('Automated trading stopped');
  }

  /**
   * Add strategy to automated trading
   */
  public addStrategy(strategy: Strategy): void {
    this.activeStrategies.set(strategy.id, strategy);
    logger.info(`Strategy ${strategy.id} added to automated trading`);
  }

  /**
   * Remove strategy from automated trading
   */
  public removeStrategy(strategyId: string): void {
    this.activeStrategies.delete(strategyId);
    logger.info(`Strategy ${strategyId} removed from automated trading`);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AutomatedTradingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Automated trading configuration updated', this.config);
  }

  /**
   * Main update loop
   */
  private async update(): Promise<void> {
    try {
      // Get account balance
      const balance: BalanceResponse = await poloniexApi.getAccountBalance();

      // Check if we can open new positions
      if (this.positions.size >= this.config.maxPositions) {
        return;
      }

      // Execute each active strategy
      for (const [, strategy] of this.activeStrategies) {
        // Get market data
        const marketData = await poloniexApi.getMarketData(strategy.parameters.pair);

        // Execute strategy
        const { signal } = executeStrategy(strategy, marketData);

        if (signal) {
          await this.executeTrade(strategy, signal, parseFloat(balance.availableAmount));
        }
      }
    } catch (error) {
      logger.error('Error in automated trading update:', error);
    }
  }

  /**
   * Execute a trade based on strategy signal
   */
  private async executeTrade(
    strategy: Strategy,
    signal: 'BUY' | 'SELL',
    availableBalance: number
  ): Promise<void> {
    try {
      const pair = strategy.parameters.pair;

      // Calculate position size based on risk
      const riskAmount = (availableBalance * this.config.riskPerTrade) / 100;
      const marketData = await poloniexApi.getMarketData(pair);
      const lastPrice = marketData[marketData.length - 1].close;
      const quantity = riskAmount / lastPrice;

      // Place main order
      await poloniexApi.placeOrder(
        pair,
        signal.toLowerCase() as 'buy' | 'sell',
        'market',
        quantity
      );

      // Place stop loss
      const stopPrice =
        signal === 'BUY'
          ? lastPrice * (1 - this.config.stopLossPercent / 100)
          : lastPrice * (1 + this.config.stopLossPercent / 100);

      await poloniexApi.placeConditionalOrder(
        pair,
        signal === 'BUY' ? 'sell' : 'buy',
        'stop',
        quantity,
        stopPrice
      );

      // Place take profit
      const takeProfitPrice =
        signal === 'BUY'
          ? lastPrice * (1 + this.config.takeProfitPercent / 100)
          : lastPrice * (1 - this.config.takeProfitPercent / 100);

      await poloniexApi.placeConditionalOrder(
        pair,
        signal === 'BUY' ? 'sell' : 'buy',
        'takeProfit',
        quantity,
        takeProfitPrice
      );

      logger.info(`Trade executed for strategy ${strategy.id}`, {
        signal,
        pair,
        quantity,
        stopPrice,
        takeProfitPrice,
      });
    } catch (error) {
      logger.error('Error executing trade:', error);
    }
  }

  /**
   * Handle position update from exchange
   */
  private handlePositionUpdate(position: unknown): void {
    const typedPosition = position as Position;
    this.positions.set(typedPosition.symbol, typedPosition);
    logger.info('Position updated:', typedPosition);
  }

  /**
   * Handle liquidation warning
   */
  private handleLiquidationWarning(warning: unknown): void {
    const typedWarning = warning as LiquidationWarning;
    logger.warn('Liquidation warning:', typedWarning);
    // Implement risk management logic
  }

  /**
   * Handle margin update
   */
  private handleMarginUpdate(margin: unknown): void {
    logger.info('Margin updated:', margin);
    // Implement margin management logic
  }
}

export const automatedTrading = AutomatedTradingService.getInstance();
