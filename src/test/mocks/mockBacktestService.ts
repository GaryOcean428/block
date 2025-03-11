import { BacktestResult, Strategy, StrategyType, StrategyParameters } from '../../types/strategy';
import type { Trade } from '../../types';
import { getHistoricalMarketData } from '../fixtures/marketData';

export interface BacktestOptions {
  startDate: string;
  endDate: string;
  initialBalance: number;
  tradeSize: number | 'percentage';
  tradeSizeValue: number;
  stopLoss?: number;
  takeProfit?: number;
  riskToReward?: number;
  fees?: number;
}

/**
 * Mock backtesting service for testing strategy performance
 */
export class MockBacktestService {
  /**
   * Run a backtest for a strategy with historical data
   * Uses real price data from fixtures to simulate realistic market conditions
   */
  public async runBacktest(strategy: Strategy, options: BacktestOptions): Promise<BacktestResult> {
    // Get historical market data for backtesting
    const marketData = await getHistoricalMarketData(
      strategy.parameters.pair as string,
      new Date(options.startDate),
      new Date(options.endDate)
    );

    // Initialize backtest variables
    const initialBalance = options.initialBalance;
    let balance = initialBalance;
    let position: {
      entry: number;
      amount: number;
      type: 'long' | 'short';
      entryTimestamp: number;
    } | null = null;
    let highestBalance = initialBalance;
    let lowestBalance = initialBalance;
    const trades: Trade[] = [];
    const balanceHistory: { timestamp: number; balance: number }[] = [];

    // Track metrics
    let winningTrades = 0;
    let losingTrades = 0;
    let totalPnL = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let totalWins = 0;
    let totalLosses = 0;

    // Record starting balance
    balanceHistory.push({
      timestamp: new Date(options.startDate).getTime(),
      balance,
    });

    // Generate trading signals for each market data point
    for (let i = 0; i < marketData.length; i++) {
      const candle = marketData[i];
      const timestamp = candle.timestamp;

      // Use previous data for strategy calculation
      const lookbackData = marketData.slice(0, i + 1);

      // Generate signal for this point
      const signal = this.generateSignal(strategy, lookbackData);

      // Handle position entry
      if (position === null && signal !== 'NEUTRAL') {
        // Calculate position size
        let positionSize = 0;

        if (options.tradeSize === 'percentage') {
          positionSize = balance * (options.tradeSizeValue / 100);
        } else {
          positionSize = options.tradeSizeValue;
        }

        // Limit position size to available balance
        positionSize = Math.min(positionSize, balance);

        // Enter position
        const entryPrice = candle.close;
        const amount = positionSize / entryPrice;

        position = {
          entry: entryPrice,
          amount,
          type: signal === 'BUY' ? 'long' : 'short',
          entryTimestamp: timestamp,
        };
      }
      // Handle position exit
      else if (position !== null) {
        const exitPrice = candle.close;
        let shouldExit = false;
        let exitReason = '';

        // Check for opposing signal
        if (
          (position.type === 'long' && signal === 'SELL') ||
          (position.type === 'short' && signal === 'BUY')
        ) {
          shouldExit = true;
          exitReason = 'Signal';
        }

        // Check for stop loss if enabled
        if (options.stopLoss && !shouldExit) {
          if (
            position.type === 'long' &&
            (exitPrice / position.entry - 1) * 100 <= -options.stopLoss
          ) {
            shouldExit = true;
            exitReason = 'Stop Loss';
          } else if (
            position.type === 'short' &&
            (position.entry / exitPrice - 1) * 100 <= -options.stopLoss
          ) {
            shouldExit = true;
            exitReason = 'Stop Loss';
          }
        }

        // Check for take profit if enabled
        if (options.takeProfit && !shouldExit) {
          if (
            position.type === 'long' &&
            (exitPrice / position.entry - 1) * 100 >= options.takeProfit
          ) {
            shouldExit = true;
            exitReason = 'Take Profit';
          } else if (
            position.type === 'short' &&
            (position.entry / exitPrice - 1) * 100 >= options.takeProfit
          ) {
            shouldExit = true;
            exitReason = 'Take Profit';
          }
        }

        // Exit position if conditions met
        if (shouldExit) {
          const entryValue = position.entry * position.amount;
          const exitValue = exitPrice * position.amount;

          let pnl = 0;
          let pnlPercent = 0;

          if (position.type === 'long') {
            pnl = exitValue - entryValue;
            pnlPercent = (exitPrice / position.entry - 1) * 100;
          } else {
            pnl = entryValue - exitValue;
            pnlPercent = (position.entry / exitPrice - 1) * 100;
          }

          // Apply trading fees if specified
          if (options.fees) {
            const fees = (entryValue + exitValue) * (options.fees / 100);
            pnl -= fees;
          }

          // Update balance
          balance += pnl;
          totalPnL += pnl;

          // Update highest/lowest balance
          highestBalance = Math.max(highestBalance, balance);
          lowestBalance = Math.min(lowestBalance, balance);

          // Track win/loss
          if (pnl > 0) {
            winningTrades++;
            largestWin = Math.max(largestWin, pnl);
            totalWins += pnl;
          } else {
            losingTrades++;
            largestLoss = Math.min(largestLoss, pnl);
            totalLosses += pnl;
          }

          // Record trade
          trades.push({
            id: `trade-${trades.length + 1}`,
            strategyId: strategy.id,
            pair: strategy.parameters.pair as string,
            timestamp,
            type: position.type === 'long' ? 'SELL' : 'BUY',
            price: exitPrice,
            amount: position.amount,
            total: exitValue,
            pnl,
            pnlPercent,
            status: 'COMPLETED',
            metadata: {
              entryPrice: position.entry,
              entryTimestamp: position.entryTimestamp,
              exitReason,
            },
          });

          // Reset position
          position = null;

          // Record balance history
          balanceHistory.push({ timestamp, balance });
        }
      }
    }

    // Close any open position at the end of the backtest
    if (position !== null) {
      const lastCandle = marketData[marketData.length - 1];
      const exitPrice = lastCandle.close;
      const entryValue = position.entry * position.amount;
      const exitValue = exitPrice * position.amount;

      let pnl = 0;
      let pnlPercent = 0;

      if (position.type === 'long') {
        pnl = exitValue - entryValue;
        pnlPercent = (exitPrice / position.entry - 1) * 100;
      } else {
        pnl = entryValue - exitValue;
        pnlPercent = (position.entry / exitPrice - 1) * 100;
      }

      // Apply trading fees if specified
      if (options.fees) {
        const fees = (entryValue + exitValue) * (options.fees / 100);
        pnl -= fees;
      }

      // Update balance
      balance += pnl;
      totalPnL += pnl;

      // Update highest/lowest balance
      highestBalance = Math.max(highestBalance, balance);

      // Track win/loss
      if (pnl > 0) {
        winningTrades++;
        largestWin = Math.max(largestWin, pnl);
        totalWins += pnl;
      } else {
        losingTrades++;
        largestLoss = Math.min(largestLoss, pnl);
        totalLosses += pnl;
      }

      // Record trade
      trades.push({
        id: `trade-${trades.length + 1}`,
        strategyId: strategy.id,
        pair: strategy.parameters.pair as string,
        timestamp: lastCandle.timestamp,
        type: position.type === 'long' ? 'SELL' : 'BUY',
        price: exitPrice,
        amount: position.amount,
        total: exitValue,
        pnl,
        pnlPercent,
        status: 'COMPLETED',
        metadata: {
          entryPrice: position.entry,
          entryTimestamp: position.entryTimestamp,
          exitReason: 'End of Backtest',
        },
      });

      // Record final balance
      balanceHistory.push({ timestamp: lastCandle.timestamp, balance });
    }

    // Calculate performance metrics
    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const maxDrawdown = this.calculateMaxDrawdown(balanceHistory, initialBalance);
    const dailyReturns = this.calculateDailyReturns(balanceHistory);
    const volatility = this.calculateVolatility(dailyReturns);
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns, volatility);
    const profitFactor =
      totalLosses !== 0 ? Math.abs(totalWins / totalLosses) : totalWins > 0 ? Infinity : 0;
    const averageWin = winningTrades > 0 ? totalWins / winningTrades : 0;
    const averageLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
    const averageTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;
    const recoveryFactor = maxDrawdown > 0 ? totalPnL / maxDrawdown : Infinity;

    // Return comprehensive backtest results
    return {
      strategyId: strategy.id,
      startDate: options.startDate,
      endDate: options.endDate,
      initialBalance,
      finalBalance: balance,
      totalPnL,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      maxDrawdown,
      sharpeRatio,
      trades,
      balanceHistory,
      metrics: {
        profitFactor,
        recoveryFactor,
        averageWin,
        averageLoss,
        averageTrade,
        largestWin,
        largestLoss,
        volatility,
        dailyReturns,
      },
    };
  }

  /**
   * Generate a trading signal based on strategy type and parameters
   */
  private generateSignal(
    strategy: Strategy,
    marketData: {
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    switch (strategy.type) {
      case StrategyType.MA_CROSSOVER:
        return this.maCrossoverStrategy(strategy.parameters, marketData);
      case StrategyType.RSI:
        return this.rsiStrategy(strategy.parameters, marketData);
      case StrategyType.BREAKOUT:
        return this.breakoutStrategy(strategy.parameters, marketData);
      case StrategyType.MACD:
        return this.macdStrategy(strategy.parameters, marketData);
      default:
        return 'NEUTRAL';
    }
  }

  /**
   * Moving Average Crossover strategy implementation
   */
  private maCrossoverStrategy(
    parameters: StrategyParameters,
    marketData: {
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    const shortPeriod = parameters.shortPeriod as number;
    const longPeriod = parameters.longPeriod as number;

    // Need enough data for calculation
    if (marketData.length <= longPeriod) {
      return 'NEUTRAL';
    }

    // Calculate short MA
    const shortMA = this.calculateSMA(marketData.slice(-shortPeriod - 1), shortPeriod);

    // Calculate long MA
    const longMA = this.calculateSMA(marketData.slice(-longPeriod - 1), longPeriod);

    // Calculate previous values for crossover detection
    const prevShortMA = this.calculateSMA(marketData.slice(-shortPeriod - 2, -1), shortPeriod);

    const prevLongMA = this.calculateSMA(marketData.slice(-longPeriod - 2, -1), longPeriod);

    // Check for crossovers
    if (prevShortMA <= prevLongMA && shortMA > longMA) {
      return 'BUY'; // Golden Cross
    } else if (prevShortMA >= prevLongMA && shortMA < longMA) {
      return 'SELL'; // Death Cross
    }

    return 'NEUTRAL';
  }

  /**
   * RSI strategy implementation
   */
  private rsiStrategy(
    parameters: StrategyParameters,
    marketData: {
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    const period = (parameters.period as number) || 14;
    const overbought = (parameters.overbought as number) || 70;
    const oversold = (parameters.oversold as number) || 30;

    // Need enough data for calculation
    if (marketData.length <= period + 1) {
      return 'NEUTRAL';
    }

    // Calculate RSI
    const rsi = this.calculateRSI(marketData, period);
    const prevRSI = this.calculateRSI(marketData.slice(0, -1), period);

    // Generate signals
    if (prevRSI <= oversold && rsi > oversold) {
      return 'BUY'; // Oversold to normal
    } else if (prevRSI >= overbought && rsi < overbought) {
      return 'SELL'; // Overbought to normal
    }

    return 'NEUTRAL';
  }

  /**
   * Breakout strategy implementation
   */
  private breakoutStrategy(
    parameters: StrategyParameters,
    marketData: {
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    const lookbackPeriod = (parameters.lookbackPeriod as number) || 20;
    const breakoutThreshold = (parameters.breakoutThreshold as number) || 1;

    // Need enough data for calculation
    if (marketData.length <= lookbackPeriod) {
      return 'NEUTRAL';
    }

    // Get price data for analysis
    const priceData = marketData.slice(-lookbackPeriod - 1).map(d => d.close);
    const currentClose = priceData[priceData.length - 1];

    // Calculate highest high and lowest low
    const highestHigh = Math.max(...marketData.slice(-lookbackPeriod - 1, -1).map(d => d.high));
    const lowestLow = Math.min(...marketData.slice(-lookbackPeriod - 1, -1).map(d => d.low));

    // Check for breakouts
    if (currentClose > highestHigh * (1 + breakoutThreshold / 100)) {
      return 'BUY'; // Bullish breakout
    } else if (currentClose < lowestLow * (1 - breakoutThreshold / 100)) {
      return 'SELL'; // Bearish breakout
    }

    return 'NEUTRAL';
  }

  /**
   * MACD strategy implementation
   */
  private macdStrategy(
    parameters: StrategyParameters,
    marketData: {
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    const fastPeriod = (parameters.fastPeriod as number) || 12;
    const slowPeriod = (parameters.slowPeriod as number) || 26;
    const signalPeriod = (parameters.signalPeriod as number) || 9;

    // Need enough data for calculation
    if (marketData.length <= slowPeriod + signalPeriod) {
      return 'NEUTRAL';
    }

    // Calculate MACD
    const { macd, signal } = this.calculateMACD(
      marketData.map(d => d.close),
      fastPeriod,
      slowPeriod,
      signalPeriod
    );

    // Calculate previous values for crossover detection
    const prevMACD = macd[macd.length - 2];
    const prevSignal = signal[signal.length - 2];
    const currentMACD = macd[macd.length - 1];
    const currentSignal = signal[signal.length - 1];

    // Check for crossovers
    if (prevMACD <= prevSignal && currentMACD > currentSignal) {
      return 'BUY'; // Bullish crossover
    } else if (prevMACD >= prevSignal && currentMACD < currentSignal) {
      return 'SELL'; // Bearish crossover
    }

    return 'NEUTRAL';
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  private calculateSMA(data: { close: number }[], period: number): number {
    if (data.length < period) {
      return 0;
    }

    const prices = data.slice(-period).map(candle => candle.close);
    const sum = prices.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  private calculateRSI(data: { close: number }[], period: number): number {
    if (data.length <= period) {
      return 50; // Default value
    }

    const prices = data.map(candle => candle.close);
    const priceChanges = [];

    for (let i = 1; i < prices.length; i++) {
      priceChanges.push(prices[i] - prices[i - 1]);
    }

    let avgGain = 0;
    let avgLoss = 0;

    // Initial RS calculation
    for (let i = 0; i < period; i++) {
      if (priceChanges[i] >= 0) {
        avgGain += priceChanges[i];
      } else {
        avgLoss += Math.abs(priceChanges[i]);
      }
    }

    avgGain /= period;
    avgLoss /= period;

    // Smooth RS calculation
    for (let i = period; i < priceChanges.length; i++) {
      if (priceChanges[i] >= 0) {
        avgGain = (avgGain * (period - 1) + priceChanges[i]) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(priceChanges[i])) / period;
      }
    }

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate MACD values
   */
  private calculateMACD(
    prices: number[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): { macd: number[]; signal: number[] } {
    // Calculate EMAs
    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);

    // Calculate MACD line
    const macdLine = emaFast
      .map((fast, i) => {
        if (i < slowPeriod - fastPeriod) return 0;
        return fast - emaSlow[i - (slowPeriod - fastPeriod)];
      })
      .slice(slowPeriod - fastPeriod);

    // Calculate signal line
    const signalLine = this.calculateEMA(macdLine, signalPeriod);

    return {
      macd: macdLine,
      signal: signalLine,
    };
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  private calculateEMA(prices: number[], period: number): number[] {
    const ema = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA
    let sma = 0;
    for (let i = 0; i < period; i++) {
      sma += prices[i];
    }
    sma /= period;

    ema.push(sma);

    // Calculate EMA
    for (let i = period; i < prices.length; i++) {
      ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
    }

    return ema;
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(
    balanceHistory: { timestamp: number; balance: number }[],
    initialBalance: number
  ): number {
    let maxDrawdown = 0;
    let peak = initialBalance;

    balanceHistory.forEach(point => {
      if (point.balance > peak) {
        peak = point.balance;
      } else {
        const drawdown = ((peak - point.balance) / peak) * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    });

    return maxDrawdown;
  }

  /**
   * Calculate daily returns
   */
  private calculateDailyReturns(
    balanceHistory: { timestamp: number; balance: number }[]
  ): number[] {
    if (balanceHistory.length < 2) {
      return [];
    }

    const dailyReturns = [];
    let currentDayTimestamp = new Date(balanceHistory[0].timestamp).setHours(0, 0, 0, 0);
    let currentDayBalance = balanceHistory[0].balance;

    for (let i = 1; i < balanceHistory.length; i++) {
      const dayTimestamp = new Date(balanceHistory[i].timestamp).setHours(0, 0, 0, 0);

      if (dayTimestamp > currentDayTimestamp) {
        // Calculate return for the day
        const prevDayBalance = currentDayBalance;
        currentDayBalance = balanceHistory[i].balance;
        const dailyReturn = ((currentDayBalance - prevDayBalance) / prevDayBalance) * 100;
        dailyReturns.push(dailyReturn);

        currentDayTimestamp = dayTimestamp;
      } else {
        // Update the current day balance
        currentDayBalance = balanceHistory[i].balance;
      }
    }

    return dailyReturns;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(dailyReturns: number[]): number {
    if (dailyReturns.length === 0) {
      return 0;
    }

    const mean = dailyReturns.reduce((acc, return_) => acc + return_, 0) / dailyReturns.length;
    const squaredDifferences = dailyReturns.map(return_ => Math.pow(return_ - mean, 2));
    const variance = squaredDifferences.reduce((acc, diff) => acc + diff, 0) / dailyReturns.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateSharpeRatio(dailyReturns: number[], volatility: number): number {
    if (dailyReturns.length === 0 || volatility === 0) {
      return 0;
    }

    // Assume risk-free rate is 2% annually (0.00548% daily)
    const riskFreeRate = 0.00548;

    // Calculate average daily return
    const avgReturn = dailyReturns.reduce((acc, return_) => acc + return_, 0) / dailyReturns.length;

    // Calculate Sharpe Ratio
    return (avgReturn - riskFreeRate) / volatility;
  }
}

export const mockBacktestService = new MockBacktestService();
