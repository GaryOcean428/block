import type {
  BacktestResult,
  MarketData,
  BacktestTrade,
  Strategy,
  BacktestMetrics,
  BacktestOptions,
} from '../types';
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

    // Execute the strategy with the data
    // We'll pass the strategy as is, since we can't modify its type
    const executionResult = executeStrategy(strategy, marketData);

    // Log execution result for debugging with market context information
    if (executionResult) {
      console.log(`Strategy executed successfully with ${marketData.length} data points`);
      console.log(
        `Market context: slippage=${marketContext.slippage}, fees=${marketContext.feeRate}`
      );
    } else {
      console.warn('Strategy execution returned no result');
    }

    // Mock data for demonstration - this would come from the strategy executor in a full implementation
    const trades: BacktestTrade[] = [];
    const balanceHistory: Array<{ timestamp: number; balance: number }> = [
      { timestamp: Date.now(), balance: initialBalance },
    ];

    // Apply market friction to balance calculation
    // This is where we would use the market context in a real implementation
    if (trades.length > 0) {
      console.log(
        `Applying market friction: reducing returns by approximately ${slippage * 100}% for slippage and ${feeRate * 100}% for fees per trade`
      );
    }

    // Calculate backtest metrics
    const metrics = this.calculateMetrics(trades);

    // Return backtest result with null safety
    const finalBalance =
      balanceHistory.length > 0
        ? (balanceHistory[balanceHistory.length - 1]?.balance ?? initialBalance)
        : initialBalance;

    return {
      strategyId: strategy.id || '',
      startDate,
      endDate,
      initialBalance,
      finalBalance,
      totalPnL: finalBalance - initialBalance,
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.pnl > 0).length,
      losingTrades: trades.filter(t => t.pnl < 0).length,
      winRate: trades.length > 0 ? trades.filter(t => t.pnl > 0).length / trades.length : 0,
      maxDrawdown: this.calculateMaxDrawdown(trades),
      sharpeRatio: this.calculateSharpeRatio(trades),
      trades,
      metrics,
    };
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
export const backtestService = new BacktestService();

// Also export the class for testing and extension
export default BacktestService;
