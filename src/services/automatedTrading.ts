import type { Strategy } from '../types/strategy';
import { executeStrategy } from '../utils/strategyExecutors';
import { poloniexApi } from './poloniexAPI';
import { logger } from '../utils/logger';
import { realTimePriceService, PriceUpdate } from './realTimePriceService';

interface AutomatedTradingConfig {
  maxPositions: number;
  maxLeverage: number;
  riskPerTrade: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent?: number;
  maxDrawdown: number;
  maxDailyLoss: number;
  correlationThreshold: number;
}

// Interface matching the Poloniex API response for positions
interface Position {
  id?: string;
  symbol: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  marginMode?: 'cross' | 'isolated';
  leverage: number;
  liquidationPrice: number;
  side: 'long' | 'short';
  status: 'open' | 'closed';
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  openTime?: number;
  closeTime?: number;
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

// Interface for trade journal entry
interface TradeJournalEntry {
  id: string;
  strategyId: string;
  pair: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  pnl?: number;
  pnlPercent?: number;
  openTime: number;
  closeTime?: number;
  status: 'open' | 'closed';
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
}

// Position manager interface
interface PositionManager {
  getActivePositions(): Position[];
  calculateOptimalPositionSize(strategy: Strategy, balance: number, risk: number): number;
  shouldClosePosition(position: Position, marketData: any[]): boolean;
  applyTrailingStop(position: Position, currentPrice: number): void;
}

// Risk manager interface
interface RiskManager {
  calculatePortfolioRisk(): number;
  checkPositionCorrelation(newPosition: Position): number;
  suggestPositionSize(strategy: Strategy, maxRiskPercent: number): number;
  calculateMaxDrawdown(positions: Position[]): number;
}

class AutomatedTradingService implements PositionManager, RiskManager {
  private static instance: AutomatedTradingService;
  private readonly activeStrategies: Map<string, Strategy> = new Map();
  private readonly positions: Map<string, Position> = new Map();
  private readonly tradeJournal: TradeJournalEntry[] = [];
  private config: AutomatedTradingConfig;
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private dailyStats: {
    date: string;
    trades: number;
    wins: number;
    losses: number;
    pnl: number;
    startBalance: number;
    endBalance: number;
  } = {
    date: new Date().toISOString().split('T')[0],
    trades: 0,
    wins: 0,
    losses: 0,
    pnl: 0,
    startBalance: 0,
    endBalance: 0,
  };
  private priceSubscriptions: Map<string, any> = new Map();

  private constructor() {
    // Default configuration
    this.config = {
      maxPositions: 3,
      maxLeverage: 5,
      riskPerTrade: 2, // Percentage of account balance
      stopLossPercent: 2,
      takeProfitPercent: 4,
      trailingStopPercent: 1,
      maxDrawdown: 10, // Maximum drawdown percentage allowed
      maxDailyLoss: 5, // Maximum daily loss percentage allowed
      correlationThreshold: 0.7, // Correlation threshold for position diversification
    };

    // Subscribe to position updates
    poloniexApi.onPositionUpdate(this.handlePositionUpdate.bind(this));
    poloniexApi.onLiquidationWarning(this.handleLiquidationWarning.bind(this));
    poloniexApi.onMarginUpdate(this.handleMarginUpdate.bind(this));

    // Initialize daily stats
    this.resetDailyStats();
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

    // Initialize daily stats if needed
    if (this.dailyStats.startBalance === 0) {
      this.initializeDailyStats();
    }
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

    // Unsubscribe from price updates
    this.priceSubscriptions.forEach(subscription => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    this.priceSubscriptions.clear();

    logger.info('Automated trading stopped');
  }

  /**
   * Add strategy to automated trading
   */
  public addStrategy(strategy: Strategy): void {
    this.activeStrategies.set(strategy.id, strategy);
    logger.info(`Strategy ${strategy.id} added to automated trading`);

    // Subscribe to price updates for this strategy's pair
    if (strategy.parameters.pair) {
      this.subscribeToPriceUpdates(strategy.parameters.pair);
    }
  }

  /**
   * Remove strategy from automated trading
   */
  public removeStrategy(strategyId: string): void {
    const strategy = this.activeStrategies.get(strategyId);
    this.activeStrategies.delete(strategyId);
    logger.info(`Strategy ${strategyId} removed from automated trading`);

    // Check if we need to unsubscribe from price updates
    if (strategy && strategy.parameters.pair) {
      // Only unsubscribe if no other strategy is using this pair
      let pairStillInUse = false;
      for (const [, otherStrategy] of this.activeStrategies) {
        if (otherStrategy.parameters.pair === strategy.parameters.pair) {
          pairStillInUse = true;
          break;
        }
      }

      if (!pairStillInUse) {
        const subscription = this.priceSubscriptions.get(strategy.parameters.pair);
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
        this.priceSubscriptions.delete(strategy.parameters.pair);
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AutomatedTradingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Automated trading configuration updated', this.config);
  }

  /**
   * Get active positions
   */
  public getActivePositions(): Position[] {
    return Array.from(this.positions.values()).filter(p => p.status === 'open');
  }

  /**
   * Calculate optimal position size based on risk parameters
   */
  public calculateOptimalPositionSize(
    strategy: Strategy,
    balance: number,
    riskPercent: number
  ): number {
    // Get the pair from the strategy
    const pair = strategy.parameters.pair;
    if (!pair) return 0;

    // Get the latest price
    const priceUpdate = realTimePriceService.getLatestPrice(pair);
    if (!priceUpdate) return 0;

    const currentPrice = priceUpdate.price;

    // Calculate the risk amount in currency
    const riskAmount = (balance * riskPercent) / 100;

    // Calculate stop loss distance based on strategy type and volatility
    let stopLossDistance = currentPrice * (this.config.stopLossPercent / 100);

    // Adjust stop loss distance based on strategy type
    switch (strategy.type) {
      case 'RSI':
        // For RSI strategies, use the oversold level as a guide
        if (strategy.parameters.oversold) {
          const oversold = strategy.parameters.oversold as number;
          // Wider stop for RSI strategies with lower oversold thresholds
          stopLossDistance =
            currentPrice * ((this.config.stopLossPercent + (30 - oversold) / 10) / 100);
        }
        break;
      case 'BREAKOUT':
        // For breakout strategies, use the breakout threshold
        if (strategy.parameters.breakoutThreshold) {
          const threshold = strategy.parameters.breakoutThreshold as number;
          // Wider stop for higher threshold breakouts
          stopLossDistance = currentPrice * ((this.config.stopLossPercent + threshold / 2) / 100);
        }
        break;
      default:
        // Use default stop loss distance
        break;
    }

    // Calculate position size based on risk per trade
    // Position size = Risk amount / Stop loss distance
    const positionSize = riskAmount / stopLossDistance;

    // Convert to appropriate size based on price (e.g., for BTC, might be 0.01 BTC)
    // This is a simplified calculation and might need adjustment based on the specific asset
    const adjustedSize = positionSize / currentPrice;

    // Round to appropriate precision based on the asset
    // For BTC, 4 decimal places might be appropriate
    return Math.round(adjustedSize * 10000) / 10000;
  }

  /**
   * Check if a position should be closed based on current market conditions
   */
  public shouldClosePosition(position: Position, marketData: any[]): boolean {
    if (!marketData || marketData.length === 0) return false;

    // Get the latest price
    const latestData = marketData[marketData.length - 1];
    const currentPrice = latestData.close;

    // Check stop loss
    if (position.stopLoss) {
      if (
        (position.side === 'long' && currentPrice <= position.stopLoss) ||
        (position.side === 'short' && currentPrice >= position.stopLoss)
      ) {
        logger.info(`Stop loss triggered for ${position.symbol} at ${currentPrice}`);
        return true;
      }
    }

    // Check take profit
    if (position.takeProfit) {
      if (
        (position.side === 'long' && currentPrice >= position.takeProfit) ||
        (position.side === 'short' && currentPrice <= position.takeProfit)
      ) {
        logger.info(`Take profit triggered for ${position.symbol} at ${currentPrice}`);
        return true;
      }
    }

    // Check trailing stop if applicable
    if (position.trailingStop) {
      if (
        (position.side === 'long' && currentPrice <= position.trailingStop) ||
        (position.side === 'short' && currentPrice >= position.trailingStop)
      ) {
        logger.info(`Trailing stop triggered for ${position.symbol} at ${currentPrice}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Apply trailing stop to a position
   */
  public applyTrailingStop(position: Position, currentPrice: number): void {
    if (!this.config.trailingStopPercent || !position.entryPrice) return;

    // Only apply trailing stop if we're in profit
    const inProfit =
      position.side === 'long'
        ? currentPrice > position.entryPrice
        : currentPrice < position.entryPrice;

    if (!inProfit) return;

    // Calculate trailing stop level
    const trailingDistance = currentPrice * (this.config.trailingStopPercent / 100);
    const newTrailingStop =
      position.side === 'long' ? currentPrice - trailingDistance : currentPrice + trailingDistance;

    // Only update trailing stop if it would move in our favor
    if (position.trailingStop) {
      if (
        (position.side === 'long' && newTrailingStop > position.trailingStop) ||
        (position.side === 'short' && newTrailingStop < position.trailingStop)
      ) {
        position.trailingStop = newTrailingStop;
        logger.info(`Updated trailing stop for ${position.symbol} to ${newTrailingStop}`);
      }
    } else {
      // Initialize trailing stop
      position.trailingStop = newTrailingStop;
      logger.info(`Set initial trailing stop for ${position.symbol} at ${newTrailingStop}`);
    }

    // Update the position in our map
    this.positions.set(position.symbol, position);
  }

  /**
   * Calculate overall portfolio risk
   */
  public calculatePortfolioRisk(): number {
    const activePositions = this.getActivePositions();
    if (activePositions.length === 0) return 0;

    // Get account balance
    let accountEquity = 10000; // Default value
    poloniexApi
      .getAccountBalance()
      .then(balance => {
        accountEquity = parseFloat(balance.accountEquity);
      })
      .catch(() => {
        // Use default value if we can't get the actual balance
      });

    // Calculate total position value
    const totalPositionValue = activePositions.reduce((sum, position) => {
      return sum + Math.abs(position.size * position.markPrice);
    }, 0);

    // Calculate leverage ratio
    const leverageRatio = totalPositionValue / accountEquity;

    // Calculate weighted average of position risks
    const weightedRisk = activePositions.reduce((sum, position) => {
      const positionValue = Math.abs(position.size * position.markPrice);
      const weight = positionValue / totalPositionValue;

      // Calculate distance to liquidation as a percentage
      const distanceToLiquidation =
        Math.abs(position.markPrice - position.liquidationPrice) / position.markPrice;

      // Higher risk for positions closer to liquidation
      const positionRisk = (1 / distanceToLiquidation) * weight;

      return sum + positionRisk;
    }, 0);

    // Combine leverage and weighted risk
    return leverageRatio * weightedRisk * 100; // Return as percentage
  }

  /**
   * Check correlation between a new position and existing positions
   * Returns correlation coefficient (0-1) where higher values indicate higher correlation
   */
  public checkPositionCorrelation(newPosition: Position): number {
    const activePositions = this.getActivePositions();
    if (activePositions.length === 0) return 0;

    // For simplicity, we'll use a basic correlation check based on asset type
    // In a real implementation, this would use price correlation data

    // Count positions with similar assets
    const similarAssets = activePositions.filter(position => {
      // Extract base asset from symbol (e.g., BTC from BTC_USDT)
      const newAsset = newPosition.symbol.split('_')[0];
      const existingAsset = position.symbol.split('_')[0];

      // Check if they're in the same asset class
      return this.areAssetsCorrelated(newAsset, existingAsset);
    });

    // Calculate correlation as ratio of similar assets to total positions
    return similarAssets.length / activePositions.length;
  }

  /**
   * Determine if two assets are correlated
   * This is a simplified implementation - in a real system, this would use
   * historical correlation data between assets
   */
  private areAssetsCorrelated(asset1: string, asset2: string): boolean {
    // Same asset is perfectly correlated
    if (asset1 === asset2) return true;

    // Define groups of correlated assets
    const correlatedGroups = [
      ['BTC', 'ETH'], // Major cryptocurrencies
      ['SOL', 'ADA', 'AVAX'], // Alternative L1s
      ['MATIC', 'ARBITRUM', 'OP'], // L2 scaling solutions
      ['DOGE', 'SHIB'], // Meme coins
    ];

    // Check if both assets are in the same correlation group
    return correlatedGroups.some(group => group.includes(asset1) && group.includes(asset2));
  }

  /**
   * Suggest position size based on risk management rules
   */
  public suggestPositionSize(strategy: Strategy, maxRiskPercent: number): number {
    // Get account balance
    let availableBalance = 10000; // Default value
    poloniexApi
      .getAccountBalance()
      .then(balance => {
        availableBalance = parseFloat(balance.availableAmount);
      })
      .catch(() => {
        // Use default value if we can't get the actual balance
      });

    // Check portfolio risk
    const portfolioRisk = this.calculatePortfolioRisk();

    // Adjust risk based on current portfolio risk
    let adjustedRisk = maxRiskPercent;
    if (portfolioRisk > 50) {
      // High risk - reduce position size
      adjustedRisk = maxRiskPercent * 0.5;
    } else if (portfolioRisk > 25) {
      // Medium risk - slightly reduce position size
      adjustedRisk = maxRiskPercent * 0.75;
    }

    // Check correlation with existing positions
    const dummyPosition: Position = {
      symbol: strategy.parameters.pair.replace('-', '_'),
      size: 0,
      entryPrice: 0,
      markPrice: 0,
      pnl: 0,
      leverage: 1,
      liquidationPrice: 0,
      side: 'long',
      status: 'open',
    };

    const correlation = this.checkPositionCorrelation(dummyPosition);

    // Adjust risk based on correlation
    if (correlation > this.config.correlationThreshold) {
      // High correlation - reduce position size to avoid concentration risk
      adjustedRisk = adjustedRisk * (1 - correlation);
    }

    // Calculate position size based on adjusted risk
    return this.calculateOptimalPositionSize(strategy, availableBalance, adjustedRisk);
  }

  /**
   * Calculate maximum drawdown from positions
   */
  public calculateMaxDrawdown(positions: Position[]): number {
    if (positions.length === 0) return 0;

    // Get all closed positions with PnL data
    const closedPositions = positions.filter(p => p.status === 'closed' && p.pnl !== undefined);
    if (closedPositions.length === 0) return 0;

    // Sort by close time
    closedPositions.sort((a, b) => (a.closeTime || 0) - (b.closeTime || 0));

    let peak = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;

    for (const position of closedPositions) {
      runningPnl += position.pnl;

      if (runningPnl > peak) {
        peak = runningPnl;
      }

      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Get account equity for percentage calculation
    let accountEquity = 10000; // Default value
    poloniexApi
      .getAccountBalance()
      .then(balance => {
        accountEquity = parseFloat(balance.accountEquity);
      })
      .catch(() => {
        // Use default value if we can't get the actual balance
      });

    // Return as percentage of account equity
    return (maxDrawdown / accountEquity) * 100;
  }

  /**
   * Subscribe to price updates for a pair
   */
  private subscribeToPriceUpdates(pair: string): void {
    if (this.priceSubscriptions.has(pair)) return;

    const subscription = realTimePriceService
      .subscribeToPrice(pair)
      .subscribe((update: PriceUpdate) => {
        this.handlePriceUpdate(pair, update);
      });

    this.priceSubscriptions.set(pair, subscription);
    logger.info(`Subscribed to price updates for ${pair}`);
  }

  /**
   * Handle price updates
   */
  private handlePriceUpdate(pair: string, update: PriceUpdate): void {
    // Check if we have any positions for this pair
    const formattedPair = pair.replace('-', '_');
    const position = this.positions.get(formattedPair);

    if (position && position.status === 'open') {
      // Update position mark price
      position.markPrice = update.price;

      // Calculate current PnL
      const priceDiff =
        position.side === 'long'
          ? update.price - position.entryPrice
          : position.entryPrice - update.price;

      position.pnl = priceDiff * position.size;

      // Apply trailing stop if applicable
      this.applyTrailingStop(position, update.price);

      // Check if we should close the position
      if (this.shouldClosePosition(position, [{ close: update.price }])) {
        this.closePosition(position, update.price);
      }

      // Update the position in our map
      this.positions.set(formattedPair, position);
    }
  }

  /**
   * Close a position
   */
  private async closePosition(position: Position, exitPrice: number): Promise<void> {
    try {
      // Execute the close order
      const pair = position.symbol.replace('_', '-');
      const side = position.side === 'long' ? 'sell' : 'buy';

      await poloniexApi.placeOrder(pair, side, 'market', position.size);

      // Update position status
      position.status = 'closed';
      position.closeTime = Date.now();
      this.positions.set(position.symbol, position);

      // Add to trade journal
      const pnl = position.pnl || 0;
      const pnlPercent = position.entryPrice
        ? (pnl / (position.entryPrice * position.size)) * 100
        : 0;

      const journalEntry: TradeJournalEntry = {
        id: `trade_${Date.now()}`,
        strategyId: position.id?.split('_')[0] || 'unknown',
        pair: position.symbol.replace('_', '-'),
        side: position.side === 'long' ? 'buy' : 'sell',
        entryPrice: position.entryPrice,
        exitPrice,
        size: position.size,
        pnl,
        pnlPercent,
        openTime: position.openTime || 0,
        closeTime: position.closeTime,
        status: 'closed',
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        notes: `Position closed at ${exitPrice}`,
      };

      this.tradeJournal.push(journalEntry);

      // Update daily stats
      this.dailyStats.trades++;
      if (pnl > 0) {
        this.dailyStats.wins++;
      } else {
        this.dailyStats.losses++;
      }
      this.dailyStats.pnl += pnl;

      logger.info(
        `Position closed: ${position.symbol} with P&L: ${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`
      );
    } catch (error) {
      logger.error('Error closing position:', error);
    }
  }

  /**
   * Main update loop
   */
  private async update(): Promise<void> {
    try {
      // Check if we need to reset daily stats
      const today = new Date().toISOString().split('T')[0];
      if (today !== this.dailyStats.date) {
        this.resetDailyStats();
        this.initializeDailyStats();
      }

      // Check if we've exceeded max daily loss
      if (
        this.dailyStats.pnl < 0 &&
        Math.abs(this.dailyStats.pnl / this.dailyStats.startBalance) * 100 >
          this.config.maxDailyLoss
      ) {
        logger.warn(
          `Max daily loss exceeded (${this.dailyStats.pnl.toFixed(2)}). Stopping automated trading.`
        );
        this.stop();
        return;
      }

      // Check if we've exceeded max drawdown
      const maxDrawdown = this.calculateMaxDrawdown(Array.from(this.positions.values()));
      if (maxDrawdown > this.config.maxDrawdown) {
        logger.warn(
          `Max drawdown exceeded (${maxDrawdown.toFixed(2)}%). Stopping automated trading.`
        );
        this.stop();
        return;
      }

      // Get account balance
      const balance: BalanceResponse = await poloniexApi.getAccountBalance();
      const availableBalance = parseFloat(balance.availableAmount);

      // Update daily stats end balance
      this.dailyStats.endBalance = parseFloat(balance.accountEquity);

      // Check if we can open new positions
      const activePositions = this.getActivePositions();
      if (activePositions.length >= this.config.maxPositions) {
        return;
      }

      // Execute each active strategy
      for (const [strategyId, strategy] of this.activeStrategies) {
        // Skip if we already have a position for this strategy's pair
        const pair = strategy.parameters.pair.replace('-', '_');
        if (this.positions.has(pair) && this.positions.get(pair)?.status === 'open') {
          continue;
        }

        // Get market data
        const marketData = await poloniexApi.getMarketData(strategy.parameters.pair);

        // Execute strategy
        const { signal, reason } = executeStrategy(strategy, marketData);

        if (signal) {
          // Calculate position size based on risk management
          const positionSize = this.suggestPositionSize(strategy, this.config.riskPerTrade);

          if (positionSize <= 0) {
            logger.info(`Skipping trade for ${strategy.parameters.pair}: Position size too small`);
            continue;
          }

          await this.executeTrade(strategy, signal, positionSize, reason);
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
    positionSize: number,
    reason: string
  ): Promise<void> {
    try {
      const pair = strategy.parameters.pair;
      const formattedPair = pair.replace('-', '_');

      // Get current price
      const priceUpdate = realTimePriceService.getLatestPrice(pair);
      if (!priceUpdate) {
        logger.error(`Cannot execute trade: No price data for ${pair}`);
        return;
      }

      const currentPrice = priceUpdate.price;

      // Calculate stop loss and take profit levels
      const stopLossPercent = this.config.stopLossPercent;
      const takeProfitPercent = this.config.takeProfitPercent;

      const stopLossPrice =
        signal === 'BUY'
          ? currentPrice * (1 - stopLossPercent / 100)
          : currentPrice * (1 + stopLossPercent / 100);

      const takeProfitPrice =
        signal === 'BUY'
          ? currentPrice * (1 + takeProfitPercent / 100)
          : currentPrice * (1 - takeProfitPercent / 100);

      // Place main order
      const order = await poloniexApi.placeOrder(
        pair,
        signal.toLowerCase() as 'buy' | 'sell',
        'market',
        positionSize
      );

      // Create position object
      const position: Position = {
        id: `${strategy.id}_${Date.now()}`,
        symbol: formattedPair,
        size: positionSize,
        entryPrice: currentPrice,
        markPrice: currentPrice,
        pnl: 0,
        leverage: 1,
        liquidationPrice: stopLossPrice, // Simplified
        side: signal === 'BUY' ? 'long' : 'short',
        status: 'open',
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        openTime: Date.now(),
      };

      // Store the position
      this.positions.set(formattedPair, position);

      // Add to trade journal
      const journalEntry: TradeJournalEntry = {
        id: `trade_${Date.now()}`,
        strategyId: strategy.id,
        pair,
        side: signal === 'BUY' ? 'buy' : 'sell',
        entryPrice: currentPrice,
        size: positionSize,
        openTime: Date.now(),
        status: 'open',
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        notes: reason,
      };

      this.tradeJournal.push(journalEntry);

      // Place stop loss
      await poloniexApi.placeConditionalOrder(
        pair,
        signal === 'BUY' ? 'sell' : 'buy',
        'stop',
        positionSize,
        stopLossPrice
      );

      // Place take profit
      await poloniexApi.placeConditionalOrder(
        pair,
        signal === 'BUY' ? 'sell' : 'buy',
        'takeProfit',
        positionSize,
        takeProfitPrice
      );

      logger.info(`Trade executed for strategy ${strategy.id}`, {
        signal,
        pair,
        size: positionSize,
        entryPrice: currentPrice,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        reason,
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

    // Implement risk management logic - close position if too close to liquidation
    const position = this.positions.get(typedWarning.symbol);
    if (position) {
      // Calculate how close we are to liquidation as a percentage
      const distanceToLiquidation =
        (Math.abs(typedWarning.markPrice - typedWarning.liquidationPrice) /
          typedWarning.markPrice) *
        100;

      // If we're within 5% of liquidation, close the position
      if (distanceToLiquidation < 5) {
        logger.warn(`Emergency position close due to liquidation risk: ${typedWarning.symbol}`);
        this.closePosition(position, typedWarning.markPrice);
      }
    }
  }

  /**
   * Handle margin update
   */
  private handleMarginUpdate(margin: unknown): void {
    logger.info('Margin updated:', margin);
    // Implement margin management logic
  }

  /**
   * Reset daily statistics
   */
  private resetDailyStats(): void {
    const today = new Date().toISOString().split('T')[0];
    this.dailyStats = {
      date: today,
      trades: 0,
      wins: 0,
      losses: 0,
      pnl: 0,
      startBalance: this.dailyStats.endBalance || 0,
      endBalance: this.dailyStats.endBalance || 0,
    };
  }

  /**
   * Initialize daily statistics with current balance
   */
  private async initializeDailyStats(): Promise<void> {
    try {
      const balance = await poloniexApi.getAccountBalance();
      this.dailyStats.startBalance = parseFloat(balance.accountEquity);
      this.dailyStats.endBalance = parseFloat(balance.accountEquity);
    } catch (error) {
      logger.error('Error initializing daily stats:', error);
    }
  }

  /**
   * Get trade journal entries
   */
  public getTradeJournal(): TradeJournalEntry[] {
    return [...this.tradeJournal];
  }

  /**
   * Get daily statistics
   */
  public getDailyStats(): any {
    return { ...this.dailyStats };
  }

  /**
   * Get current configuration
   */
  public getConfig(): AutomatedTradingConfig {
    return { ...this.config };
  }
}

export const automatedTrading = AutomatedTradingService.getInstance();
