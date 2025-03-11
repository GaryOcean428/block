import type {
  BacktestResult,
  BacktestTrade,
  BacktestMetrics,
  BacktestOptions,
  MarketData,
} from '../types';
import type { Strategy } from '../types/strategy';
import { executeStrategy } from '../utils/strategyExecutors';
import { poloniexApi } from './poloniexAPI';

/**
 * Backtest parameter interface
 */
interface BacktestParameters {
  strategy: Strategy;
  startDate?: string;
  endDate?: string;
  initialBalance?: number;
  warmupPeriod?: number;
  fixedTradeAmount?: boolean;
  tradeAmount?: number;
  riskPercentage?: number;
  feeRate?: number;
  slippage?: number;
}

/**
 * Optimization result interface
 */
interface OptimizationResult {
  pair: string;
  timeframe: string;
  startTime: number;
  endTime: number;
  baseParameters: BacktestParameters;
  parameterRanges: Record<string, [number, number, number]>;
  optimizationTarget: string;
  results: Array<{
    parameters: Record<string, number>;
    [key: string]: unknown;
  }>;
  bestParameters: Record<string, number>;
  bestResult: Partial<BacktestResult>;
}

// Market context object with friction parameters for strategy execution
interface MarketContext {
  slippage: number;
  feeRate: number;
}

/**
 * Backtest service for backtesting trading strategies
 */
class BacktestService {
  /**
   * Run backtest for a strategy
   */
  public async runBacktest(strategy: Strategy, options: BacktestOptions): Promise<BacktestResult> {
    // Prepare backtest configuration
    const {
      initialBalance = 10000,
      startDate,
      endDate,
      // Extract configuration values for strategy execution
      slippage = 0.001,
      feeRate = 0.001,
    } = options;

    // Create market context with friction factors
    const marketContext: MarketContext = {
      slippage,
      feeRate,
    };

    if (!startDate || !endDate) {
      throw new Error('Start and end dates are required for backtesting');
    }

    // Fetch market data if not provided
    const marketData = await this.getHistoricalData(
      strategy.parameters?.pair || '',
      startDate,
      endDate
    );

    if (!marketData || marketData.length === 0) {
      throw new Error('No historical data available for the specified period');
    }

    // Initialize backtest variables
    let balance = initialBalance;
    let position: { size: number; entryPrice: number; side: 'long' | 'short' | null } = {
      size: 0,
      entryPrice: 0,
      side: null,
    };
    const trades: BacktestTrade[] = [];
    const balanceHistory: Array<{ timestamp: number; balance: number }> = [
      { timestamp: new Date(startDate).getTime(), balance: initialBalance },
    ];

    // Define position sizing based on risk
    const riskPerTrade = options.riskPercentage || 2; // Default 2% risk
    const stopLossPercent = 2; // Default 2% stop loss

    // Iterate through each candle
    for (let i = 1; i < marketData.length; i++) {
      const candle = marketData[i];
      const timestamp = new Date(candle.timestamp).getTime();
      const currentPrice = candle.close;

      // Skip warmup period if necessary (for indicators that need lookback)
      const lookbackNeeded = this.getStrategyLookbackPeriod(strategy);
      if (i < lookbackNeeded) continue;

      // Create market data subset for strategy execution
      const dataSubset = marketData.slice(0, i + 1);

      // Execute strategy to get signal
      const { signal, reason } = executeStrategy(strategy, dataSubset);

      // Handle position management
      if (position.side === null && signal) {
        // Open new position
        if (signal === 'BUY' || signal === 'SELL') {
          // Calculate position size based on risk
          const riskAmount = balance * (riskPerTrade / 100);
          const stopLossPrice =
            signal === 'BUY'
              ? currentPrice * (1 - stopLossPercent / 100)
              : currentPrice * (1 + stopLossPercent / 100);
          const riskPerUnit = Math.abs(currentPrice - stopLossPrice);
          const positionSize = riskAmount / riskPerUnit;

          // Account for slippage
          const actualEntryPrice =
            signal === 'BUY'
              ? currentPrice * (1 + marketContext.slippage)
              : currentPrice * (1 - marketContext.slippage);

          // Open position
          position = {
            size: positionSize,
            entryPrice: actualEntryPrice,
            side: signal === 'BUY' ? 'long' : 'short',
          };

          // Apply fees
          const feeAmount = actualEntryPrice * positionSize * marketContext.feeRate;
          balance -= feeAmount;

          // Record trade
          trades.push({
            timestamp,
            type: signal,
            price: actualEntryPrice,
            amount: positionSize,
            total: actualEntryPrice * positionSize,
            pnl: -feeAmount,
            pnlPercent: (-feeAmount / balance) * 100,
            balance,
          });

          // Record balance
          balanceHistory.push({ timestamp, balance });
        }
      } else if (position.side !== null) {
        // Manage existing position

        // Calculate current P&L
        const priceDiff =
          position.side === 'long'
            ? currentPrice - position.entryPrice
            : position.entryPrice - currentPrice;
        const currentPnL = priceDiff * position.size;

        // Check for exit signal
        let shouldClose = false;

        // Close on opposite signal
        if (
          (position.side === 'long' && signal === 'SELL') ||
          (position.side === 'short' && signal === 'BUY')
        ) {
          shouldClose = true;
        }

        // Close on stop loss (simulated)
        const stopLossPrice =
          position.side === 'long'
            ? position.entryPrice * (1 - stopLossPercent / 100)
            : position.entryPrice * (1 + stopLossPercent / 100);

        if (
          (position.side === 'long' && currentPrice <= stopLossPrice) ||
          (position.side === 'short' && currentPrice >= stopLossPrice)
        ) {
          shouldClose = true;
        }

        // Close position if needed
        if (shouldClose) {
          // Account for slippage
          const actualExitPrice =
            position.side === 'long'
              ? currentPrice * (1 - marketContext.slippage)
              : currentPrice * (1 + marketContext.slippage);

          // Calculate final P&L
          const priceDiff =
            position.side === 'long'
              ? actualExitPrice - position.entryPrice
              : position.entryPrice - actualExitPrice;
          const closingPnL = priceDiff * position.size;

          // Apply fees
          const feeAmount = actualExitPrice * position.size * marketContext.feeRate;
          const netPnL = closingPnL - feeAmount;

          // Update balance
          balance += netPnL;

          // Record trade
          trades.push({
            timestamp,
            type: position.side === 'long' ? 'SELL' : 'BUY',
            price: actualExitPrice,
            amount: position.size,
            total: actualExitPrice * position.size,
            pnl: netPnL,
            pnlPercent: (netPnL / (position.entryPrice * position.size)) * 100,
            balance,
          });

          // Reset position
          position = { size: 0, entryPrice: 0, side: null };

          // Record balance
          balanceHistory.push({ timestamp, balance });
        }
      }
    }

    // Close any remaining position at the end of the test
    if (position.side !== null) {
      const lastCandle = marketData[marketData.length - 1];
      const timestamp = new Date(lastCandle.timestamp).getTime();
      const currentPrice = lastCandle.close;

      // Account for slippage
      const actualExitPrice =
        position.side === 'long'
          ? currentPrice * (1 - marketContext.slippage)
          : currentPrice * (1 + marketContext.slippage);

      // Calculate final P&L
      const priceDiff =
        position.side === 'long'
          ? actualExitPrice - position.entryPrice
          : position.entryPrice - actualExitPrice;
      const closingPnL = priceDiff * position.size;

      // Apply fees
      const feeAmount = actualExitPrice * position.size * marketContext.feeRate;
      const netPnL = closingPnL - feeAmount;

      // Update balance
      balance += netPnL;

      // Record trade
      trades.push({
        timestamp,
        type: position.side === 'long' ? 'SELL' : 'BUY',
        price: actualExitPrice,
        amount: position.size,
        total: actualExitPrice * position.size,
        pnl: netPnL,
        pnlPercent: (netPnL / (position.entryPrice * position.size)) * 100,
        balance,
      });

      // Record final balance
      balanceHistory.push({ timestamp, balance });
    }

    // Calculate backtest metrics with actual trade data
    const metrics = this.calculateMetrics(trades);

    // Calculate additional key metrics
    const finalBalance = balance;
    const totalPnL = finalBalance - initialBalance;
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const maxDrawdown = this.calculateMaxDrawdown(trades);
    const sharpeRatio = this.calculateSharpeRatio(trades);

    return {
      strategyId: strategy.id || '',
      startDate,
      endDate,
      initialBalance,
      finalBalance,
      totalPnL,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      maxDrawdown,
      sharpeRatio,
      trades,
      metrics,
      balanceHistory: balanceHistory, // Added to track equity curve
    } as BacktestResult;
  }

  /**
   * Get required lookback period for a strategy's indicators
   */
  private getStrategyLookbackPeriod(strategy: Strategy): number {
    let lookback = 0;

    switch (strategy.type) {
      case 'MA_CROSSOVER':
        lookback = Math.max(
          strategy.parameters.shortPeriod || 10,
          strategy.parameters.longPeriod || 50
        );
        break;
      case 'RSI':
        lookback = strategy.parameters.period || 14;
        break;
      case 'MACD':
        lookback =
          Math.max(strategy.parameters.fastPeriod || 12, strategy.parameters.slowPeriod || 26) +
          (strategy.parameters.signalPeriod || 9);
        break;
      case 'BOLLINGER_BANDS':
        lookback = strategy.parameters.period || 20;
        break;
      case 'ICHIMOKU':
        lookback =
          Math.max(
            strategy.parameters.conversionPeriod || 9,
            strategy.parameters.basePeriod || 26,
            strategy.parameters.laggingSpanPeriod || 52
          ) + (strategy.parameters.displacement || 26);
        break;
      case 'BREAKOUT':
        lookback = strategy.parameters.lookbackPeriod || 20;
        break;
      case 'PATTERN_RECOGNITION':
        lookback = 5; // Minimum needed for pattern detection
        break;
      default:
        lookback = 50; // Default safe value
    }

    return lookback;
  }

  /**
   * Get historical market data
   */
  public async getHistoricalData(
    pair: string,
    startDate: string,
    endDate: string
  ): Promise<MarketData[]> {
    if (!pair) {
      throw new Error('Pair is required to fetch historical data');
    }

    try {
      // Convert dates to timestamps
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      // Fetch data from the API
      // Convert timestamps to strings since that's what the API type expects
      const data = await poloniexApi.getHistoricalData(
        pair,
        String(startTimestamp),
        String(endTimestamp)
      );

      return data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  /**
   * Calculate backtest metrics to match the expected interface
   */
  private calculateMetrics(trades: BacktestTrade[]): BacktestMetrics {
    // Extract winning and losing trades
    const winningTradeAmounts = trades.filter(t => t.pnl > 0).map(t => t.pnl);
    const losingTradeAmounts = trades.filter(t => t.pnl < 0).map(t => t.pnl);

    // Calculate profits and losses
    const totalProfit = winningTradeAmounts.reduce((sum, pnl) => sum + pnl, 0);
    const totalLoss = losingTradeAmounts.reduce((sum, pnl) => sum + pnl, 0);

    // Calculate advanced metrics
    const averageWin =
      winningTradeAmounts.length > 0 ? totalProfit / winningTradeAmounts.length : 0;

    const averageLoss = losingTradeAmounts.length > 0 ? totalLoss / losingTradeAmounts.length : 0;

    const largestWin = winningTradeAmounts.length > 0 ? Math.max(...winningTradeAmounts) : 0;

    const largestLoss = losingTradeAmounts.length > 0 ? Math.min(...losingTradeAmounts) : 0;

    // Calculate profitability factor with extracted ternary logic
    let profitFactor = 0;
    if (Math.abs(totalLoss) > 0) {
      profitFactor = Math.abs(totalProfit / totalLoss);
    } else if (totalProfit > 0) {
      profitFactor = Number.MAX_SAFE_INTEGER;
    }

    const maxDrawdown = this.calculateMaxDrawdown(trades);
    const recoveryFactor = maxDrawdown > 0 ? Math.abs(totalProfit + totalLoss) / maxDrawdown : 0;

    // Time-based metrics (mocked for now)
    const dailyReturns: number[] = [];
    const monthlyReturns: number[] = [];

    // Return metrics object matching the BacktestMetrics interface
    return {
      dailyReturns,
      monthlyReturns,
      volatility: this.calculateVolatility(trades),
      profitFactor,
      recoveryFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      averageHoldingPeriod: 0, // Not calculated in this implementation
      bestMonth: 0, // Not calculated in this implementation
      worstMonth: 0, // Not calculated in this implementation
    };
  }

  /**
   * Calculate volatility from trade returns
   */
  private calculateVolatility(trades: BacktestTrade[]): number {
    if (!trades || trades.length < 2) return 0;

    // Extract returns
    const returns = trades.map(t => t.pnlPercent);

    // Calculate standard deviation
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate maximum drawdown from trades
   */
  private calculateMaxDrawdown(trades: BacktestTrade[]): number {
    if (!trades || trades.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let cumPnL = 0;

    for (const trade of trades) {
      cumPnL += trade.pnl;

      if (cumPnL > peak) {
        peak = cumPnL;
      }

      const drawdown = peak - cumPnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate Sharpe ratio from trades
   */
  private calculateSharpeRatio(trades: BacktestTrade[]): number {
    if (!trades || trades.length < 2) return 0;

    // Calculate returns
    const returns = trades.map(t => t.pnl);

    // Calculate average return
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

    // Calculate standard deviation
    const squaredDiffs = returns.map(ret => Math.pow(ret - avgReturn, 2));
    const variance = squaredDiffs.reduce((sum, sqDiff) => sum + sqDiff, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    // Calculate Sharpe ratio (assuming risk-free rate = 0)
    return stdDev === 0 ? 0 : avgReturn / stdDev;
  }

  /**
   * Generate parameter combinations for optimization
   */
  private generateParameterCombinations(
    parameterRanges: Record<string, [number, number, number]>
  ): Array<Record<string, number>> {
    const result: Array<Record<string, number>> = [];
    const paramNames = Object.keys(parameterRanges);

    // Base case: no parameters to vary
    if (paramNames.length === 0) {
      return [{}];
    }

    // Generate values for each parameter
    const paramValues: Record<string, number[]> = {};

    for (const paramName of paramNames) {
      const range = parameterRanges[paramName];
      if (!range) continue;

      const [start, end, step] = range;
      const values: number[] = [];

      // Generate values in range
      for (let value = start; value <= end; value += step) {
        values.push(value);
      }

      paramValues[paramName] = values;
    }

    // Helper function to generate combinations
    const generateCombinations = (
      index: number,
      currentCombination: Record<string, number>
    ): void => {
      if (index === paramNames.length) {
        // We've assigned values to all parameters, add combination to results
        result.push({ ...currentCombination });
        return;
      }

      const paramName = paramNames[index];
      if (!paramName) {
        // Skip this parameter if it's undefined
        generateCombinations(index + 1, currentCombination);
        return;
      }

      const values = paramValues[paramName];
      if (!values) {
        // Skip this parameter if the values array is undefined
        generateCombinations(index + 1, currentCombination);
        return;
      }

      for (const value of values) {
        currentCombination[paramName] = value;
        generateCombinations(index + 1, currentCombination);
      }
    };

    // Start combination generation
    generateCombinations(0, {});

    return result;
  }

  /**
   * Execute multiple backtests and find optimal parameters
   */
  async runBacktestOptimization(
    pair: string,
    timeframe: string,
    startTime: number,
    endTime: number,
    baseParameters: BacktestParameters,
    parameterRanges: Record<string, [number, number, number]>,
    optimizationTarget: string = 'netProfit'
  ): Promise<OptimizationResult> {
    if (!pair || !timeframe) {
      throw new Error('Missing required parameters: pair or timeframe');
    }

    // Format dates for API call - ensure we have valid strings
    const startDateStr = startTime ? new Date(startTime).toISOString().split('T')[0] : '';
    const endDateStr = endTime ? new Date(endTime).toISOString().split('T')[0] : '';

    if (!startDateStr || !endDateStr) {
      throw new Error('Invalid start or end time provided');
    }

    const marketData = await this.getHistoricalData(pair, startDateStr, endDateStr);

    if (!marketData.length) {
      throw new Error('No historical data available for the specified parameters');
    }

    // Generate all parameter combinations
    const parameterCombinations = this.generateParameterCombinations(parameterRanges);

    // Run backtest for each parameter combination
    const results: Array<{ parameters: Record<string, number>; result: Partial<BacktestResult> }> =
      [];

    for (const parameterSet of parameterCombinations) {
      try {
        // Merge base parameters with current parameter set
        const currentParameters = {
          ...baseParameters,
          ...parameterSet,
        };

        // Create options with null safety
        const strategy = currentParameters.strategy;
        if (!strategy) {
          console.error('Missing strategy in parameters');
          continue;
        }

        // Execute the strategy with these parameters
        const options: BacktestOptions = {
          initialBalance: currentParameters.initialBalance ?? 10000,
          startDate: startDateStr,
          endDate: endDateStr,
          slippage: currentParameters.slippage ?? 0.001,
          feeRate: currentParameters.feeRate ?? 0.001,
          useHistoricalData: true,
        };

        // Run the backtest
        const backtestResult = await this.runBacktest(strategy, options);

        // Store result with parameters
        results.push({
          parameters: parameterSet,
          result: backtestResult,
        });
      } catch (error) {
        console.error('Error in optimization run:', error);
        // Continue with next parameter set
      }
    }

    // Sort results by optimization target (descending)
    results.sort((a, b) => {
      // Safe access to possibly undefined properties with optional chaining
      const aResult = a?.result;
      const bResult = b?.result;

      // Handle cases where the optimization target is not present or not a number
      let valueA = 0;
      let valueB = 0;

      if (typeof aResult === 'object' && aResult !== null && optimizationTarget in aResult) {
        const rawValue = aResult[optimizationTarget as keyof typeof aResult];
        valueA = typeof rawValue === 'number' ? rawValue : 0;
      }

      if (typeof bResult === 'object' && bResult !== null && optimizationTarget in bResult) {
        const rawValue = bResult[optimizationTarget as keyof typeof bResult];
        valueB = typeof rawValue === 'number' ? rawValue : 0;
      }

      return valueB - valueA;
    });

    // Create safe default values for best parameters and results
    const bestParameters = results.length > 0 && results[0] ? results[0].parameters : {};
    const bestResult = results.length > 0 && results[0] ? results[0].result : {};

    // Return optimization results with null checks
    return {
      pair,
      timeframe,
      startTime,
      endTime,
      baseParameters,
      parameterRanges,
      optimizationTarget,
      results: results.map(r => ({
        parameters: r.parameters,
        [optimizationTarget]:
          r.result && typeof r.result === 'object' && optimizationTarget in r.result
            ? r.result[optimizationTarget as keyof typeof r.result]
            : null,
      })),
      bestParameters,
      bestResult,
    };
  }
}

// Create and export a singleton instance of the BacktestService
/**
 * Interface for ML model features
 */
interface MLFeatures {
  strategyType: string;
  parameters: Record<string, number>;
  marketCondition: 'bull' | 'bear' | 'sideways';
  volatility: number;
  volume: number;
  timeOfDay?: number;
  dayOfWeek?: number;
}

/**
 * Interface for ML model predictions
 */
interface MLPrediction {
  profitability: number;
  confidence: number;
  recommendedParameters?: Record<string, number>;
}

/**
 * ML Strategy Optimizer class
 */
class MLStrategyOptimizer {
  private modelLoaded = false;
  private historicalOptimizations: Record<string, any>[] = [];

  /**
   * Initialize ML model
   */
  public async initialize(): Promise<boolean> {
    try {
      // In a real implementation, this would load the ML model
      // For now, we'll simulate it
      this.modelLoaded = true;

      // Load historical optimizations from storage
      // This would typically come from a database
      this.historicalOptimizations = [];

      return true;
    } catch (error) {
      console.error('Failed to initialize ML model:', error);
      return false;
    }
  }

  /**
   * Predict strategy performance
   */
  public async predictStrategyPerformance(
    strategy: Strategy,
    marketData: MarketData[]
  ): Promise<MLPrediction> {
    if (!this.modelLoaded) {
      await this.initialize();
    }

    try {
      // Extract features for the ML model
      const features = this.extractFeatures(strategy, marketData);

      // In a real implementation, this would call the actual ML model
      // For now, we'll simulate it with a rule-based approach
      return this.simulateMLPrediction(features);
    } catch (error) {
      console.error('Error in ML prediction:', error);
      return {
        profitability: 0,
        confidence: 0,
      };
    }
  }

  /**
   * Extract features for ML model
   */
  private extractFeatures(strategy: Strategy, marketData: MarketData[]): MLFeatures {
    if (!marketData || marketData.length === 0) {
      throw new Error('No market data provided for feature extraction');
    }

    // Calculate market condition (simple implementation)
    const priceStart = marketData[0].close;
    const priceEnd = marketData[marketData.length - 1].close;
    const priceChange = ((priceEnd - priceStart) / priceStart) * 100;

    let marketCondition: 'bull' | 'bear' | 'sideways' = 'sideways';
    if (priceChange > 5) {
      marketCondition = 'bull';
    } else if (priceChange < -5) {
      marketCondition = 'bear';
    }

    // Calculate volatility (standard deviation of returns)
    const returns: number[] = [];
    for (let i = 1; i < marketData.length; i++) {
      const returnPct = (marketData[i].close - marketData[i - 1].close) / marketData[i - 1].close;
      returns.push(returnPct);
    }
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - meanReturn, 2));
    const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Calculate average volume
    const volume = marketData.reduce((sum, candle) => sum + candle.volume, 0) / marketData.length;

    // Extract strategy parameters
    const parameters = { ...strategy.parameters };

    // Remove non-numeric parameters
    Object.keys(parameters).forEach(key => {
      if (typeof parameters[key] !== 'number') {
        delete parameters[key];
      }
    });

    // Return features
    return {
      strategyType: strategy.type,
      parameters,
      marketCondition,
      volatility,
      volume,
    };
  }

  /**
   * Simulate ML prediction (rule-based implementation)
   */
  private simulateMLPrediction(features: MLFeatures): MLPrediction {
    // Rule-based simulation - in a real system this would be an ML model
    let profitability = 0.5; // Base value (50%)
    let confidence = 0.6; // Base confidence

    // Adjust based on market condition
    if (features.marketCondition === 'bull') {
      // Bullish strategies perform better in bull markets
      if (features.strategyType === 'BREAKOUT' || features.strategyType === 'MA_CROSSOVER') {
        profitability += 0.2;
        confidence += 0.1;
      }
    } else if (features.marketCondition === 'bear') {
      // RSI strategies often perform better in bear markets
      if (features.strategyType === 'RSI') {
        profitability += 0.15;
        confidence += 0.05;
      } else {
        profitability -= 0.1;
      }
    }

    // Adjust based on volatility
    if (features.volatility > 0.02) {
      // High volatility
      if (features.strategyType === 'BOLLINGER_BANDS') {
        profitability += 0.15;
        confidence += 0.1;
      } else if (features.strategyType === 'BREAKOUT') {
        profitability += 0.1;
      }
    } else if (features.volatility < 0.005) {
      // Low volatility
      if (features.strategyType === 'MA_CROSSOVER') {
        profitability += 0.1;
        confidence += 0.05;
      } else if (features.strategyType === 'PATTERN_RECOGNITION') {
        profitability -= 0.1;
      }
    }

    // Recommended parameter adjustments
    const recommendedParameters: Record<string, number> = {};

    // Different parameters for different strategy types
    switch (features.strategyType) {
      case 'RSI':
        if (features.marketCondition === 'bull') {
          recommendedParameters.oversold = (features.parameters.oversold as number) - 5; // Less strict oversold
          recommendedParameters.overbought = (features.parameters.overbought as number) + 5; // More strict overbought
        } else if (features.marketCondition === 'bear') {
          recommendedParameters.oversold = (features.parameters.oversold as number) + 5; // More strict oversold
          recommendedParameters.overbought = (features.parameters.overbought as number) - 5; // Less strict overbought
        }
        break;

      case 'MA_CROSSOVER':
        if (features.volatility > 0.02) {
          // In high volatility, faster MAs
          recommendedParameters.shortPeriod = Math.max(
            5,
            (features.parameters.shortPeriod as number) - 2
          );
          recommendedParameters.longPeriod = Math.max(
            15,
            (features.parameters.longPeriod as number) - 5
          );
        } else {
          // In low volatility, slower MAs
          recommendedParameters.shortPeriod = Math.min(
            20,
            (features.parameters.shortPeriod as number) + 2
          );
          recommendedParameters.longPeriod = Math.min(
            100,
            (features.parameters.longPeriod as number) + 5
          );
        }
        break;

      case 'BOLLINGER_BANDS':
        if (features.volatility > 0.02) {
          recommendedParameters.standardDeviations = Math.min(
            3,
            (features.parameters.standardDeviations as number) + 0.5
          );
        } else {
          recommendedParameters.standardDeviations = Math.max(
            1.5,
            (features.parameters.standardDeviations as number) - 0.5
          );
        }
        break;
    }

    // Ensure profitability and confidence are within bounds
    profitability = Math.max(0, Math.min(1, profitability));
    confidence = Math.max(0, Math.min(1, confidence));

    return {
      profitability,
      confidence,
      recommendedParameters,
    };
  }

  /**
   * Improve strategy based on ML predictions
   */
  public async improveStrategy(
    strategy: Strategy,
    backtestResult: BacktestResult,
    marketData: MarketData[]
  ): Promise<Strategy> {
    try {
      // Get ML prediction
      const prediction = await this.predictStrategyPerformance(strategy, marketData);

      // If confidence is too low, return original strategy
      if (prediction.confidence < 0.5 || !prediction.recommendedParameters) {
        return strategy;
      }

      // Create improved strategy with recommended parameters
      const improvedStrategy: Strategy = {
        ...strategy,
        id: `${strategy.id}_improved`,
        name: `${strategy.name} (ML Improved)`,
        parameters: {
          ...strategy.parameters,
          ...prediction.recommendedParameters,
        },
      };

      return improvedStrategy;
    } catch (error) {
      console.error('Error improving strategy:', error);
      return strategy;
    }
  }
}

/**
 * Demo Mode Trading Service
 */
class DemoTradeService {
  private isRunning = false;
  private strategy: Strategy | null = null;
  private trades: any[] = [];
  private balance = 10000;
  private initialBalance = 10000;
  private startTime: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private position: { size: number; entryPrice: number; side: 'long' | 'short' | null } = {
    size: 0,
    entryPrice: 0,
    side: null,
  };

  /**
   * Start demo trading
   */
  public start(strategy: Strategy, initialBalance: number = 10000): void {
    if (this.isRunning) return;

    this.strategy = strategy;
    this.initialBalance = initialBalance;
    this.balance = initialBalance;
    this.trades = [];
    this.startTime = Date.now();
    this.isRunning = true;

    // Start periodic update
    this.updateInterval = setInterval(() => this.update(), 5000);

    console.log(`Demo trading started with strategy: ${strategy.name}`);
  }

  /**
   * Stop demo trading
   */
  public stop(): void {
    if (!this.isRunning) return;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.isRunning = false;
    console.log('Demo trading stopped');
  }

  /**
   * Update demo trading (simulates real trading)
   */
  private async update(): Promise<void> {
    if (!this.strategy) return;

    try {
      // Get latest market data
      const pair = this.strategy.parameters.pair;
      if (!pair) return;

      // Fetch latest market data (in a real implementation, this would be real-time data)
      const marketData = await poloniexApi.getMarketData(pair);

      if (!marketData.length) return;

      // Execute strategy
      const { signal, reason } = executeStrategy(this.strategy, marketData);

      // Process signal
      if (this.position.side === null && signal) {
        // Open new position
        if (signal === 'BUY' || signal === 'SELL') {
          await this.openPosition(signal, marketData[marketData.length - 1].close, reason);
        }
      } else if (this.position.side !== null && signal) {
        // Check for exit signal
        if (
          (this.position.side === 'long' && signal === 'SELL') ||
          (this.position.side === 'short' && signal === 'BUY')
        ) {
          await this.closePosition(marketData[marketData.length - 1].close, reason);
        }
      }
    } catch (error) {
      console.error('Error in demo trading update:', error);
    }
  }

  /**
   * Open a position in demo mode
   */
  private async openPosition(signal: 'BUY' | 'SELL', price: number, reason: string): Promise<void> {
    if (this.position.side !== null) return;

    // Calculate position size (2% risk)
    const riskAmount = this.balance * 0.02;
    const stopLossPercent = 2;
    const stopLossPrice =
      signal === 'BUY' ? price * (1 - stopLossPercent / 100) : price * (1 + stopLossPercent / 100);
    const riskPerUnit = Math.abs(price - stopLossPrice);
    const positionSize = riskAmount / riskPerUnit;

    // Open position
    this.position = {
      size: positionSize,
      entryPrice: price,
      side: signal === 'BUY' ? 'long' : 'short',
    };

    // Apply fees (0.1%)
    const feeAmount = price * positionSize * 0.001;
    this.balance -= feeAmount;

    // Record trade
    const trade = {
      timestamp: Date.now(),
      type: signal,
      price,
      amount: positionSize,
      total: price * positionSize,
      pnl: -feeAmount,
      pnlPercent: (-feeAmount / this.balance) * 100,
      balance: this.balance,
      reason,
    };

    this.trades.push(trade);
    console.log(`Demo trade opened: ${signal} ${positionSize.toFixed(4)} at ${price} (${reason})`);
  }

  /**
   * Close a position in demo mode
   */
  private async closePosition(price: number, reason: string): Promise<void> {
    if (this.position.side === null) return;

    // Calculate P&L
    const priceDiff =
      this.position.side === 'long'
        ? price - this.position.entryPrice
        : this.position.entryPrice - price;
    const pnl = priceDiff * this.position.size;

    // Apply fees
    const feeAmount = price * this.position.size * 0.001;
    const netPnl = pnl - feeAmount;

    // Update balance
    this.balance += netPnl;

    // Record trade
    const trade = {
      timestamp: Date.now(),
      type: this.position.side === 'long' ? 'SELL' : 'BUY',
      price,
      amount: this.position.size,
      total: price * this.position.size,
      pnl: netPnl,
      pnlPercent: (netPnl / (this.position.entryPrice * this.position.size)) * 100,
      balance: this.balance,
      reason,
    };

    this.trades.push(trade);

    // Reset position
    const side = this.position.side;
    const size = this.position.size;
    this.position = { size: 0, entryPrice: 0, side: null };

    console.log(
      `Demo trade closed: ${side === 'long' ? 'SELL' : 'BUY'} ${size.toFixed(4)} at ${price}, P&L: ${netPnl.toFixed(2)} (${reason})`
    );
  }

  /**
   * Get demo trading performance
   */
  public getPerformance(): any {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const durationDays = duration / (1000 * 60 * 60 * 24);

    // Calculate metrics
    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter(t => t.pnl > 0).length;
    const losingTrades = this.trades.filter(t => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const profitLoss = this.balance - this.initialBalance;
    const profitLossPercent = (profitLoss / this.initialBalance) * 100;
    const annualizedReturn =
      durationDays > 0 ? Math.pow(1 + profitLossPercent / 100, 365 / durationDays) - 1 : 0;

    return {
      startTime: this.startTime,
      endTime,
      duration,
      initialBalance: this.initialBalance,
      currentBalance: this.balance,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitLoss,
      profitLossPercent,
      annualizedReturn: annualizedReturn * 100, // as percentage
      trades: this.trades,
      isLiveReady: this.isReadyForLive(),
    };
  }

  /**
   * Check if strategy is ready for live trading
   */
  private isReadyForLive(): boolean {
    if (!this.isRunning || this.trades.length < 20) {
      return false;
    }

    // Calculate key metrics to determine if ready for live trading
    const performance = this.getPerformance();

    // Criteria for live trading readiness:
    // 1. Win rate > 50%
    // 2. Profit > 5%
    // 3. At least 20 trades completed
    // 4. Running for at least 7 days
    const winRateOk = performance.winRate >= 0.5;
    const profitOk = performance.profitLossPercent >= 5;
    const tradesOk = performance.totalTrades >= 20;
    const durationOk = performance.duration >= 1000 * 60 * 60 * 24 * 7; // 7 days

    return winRateOk && profitOk && tradesOk && durationOk;
  }
}

export const backtestService = new BacktestService();
export const mlStrategyOptimizer = new MLStrategyOptimizer();
export const demoTradeService = new DemoTradeService();

// Also export the class for testing and extension
export default BacktestService;
