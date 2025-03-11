import type { MarketData } from '../types';
import { StrategyType, type Strategy } from '../types/strategy';

/**
 * Calculate Simple Moving Average for a given period
 */
export const calculateSMA = (data: number[], period: number): number => {
  if (data.length < period) {
    return 0;
  }

  const slice = data.slice(data.length - period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
};

/**
 * Calculate Exponential Moving Average
 */
export const calculateEMA = (data: number[], period: number): number => {
  if (data.length < period) {
    return 0;
  }

  const k = 2 / (period + 1);
  let ema = data[0];

  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }

  return ema;
};

/**
 * Calculate Relative Strength Index (RSI)
 */
export const calculateRSI = (data: number[], period: number): number => {
  if (data.length <= period) {
    return 50; // Default neutral value
  }

  // Get the price changes
  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  // Calculate gains and losses
  const gains = changes.map(change => (change > 0 ? change : 0));
  const losses = changes.map(change => (change < 0 ? Math.abs(change) : 0));

  // Calculate average gains and losses
  const avgGain = calculateSMA(gains.slice(-period - 1), period);
  const avgLoss = calculateSMA(losses.slice(-period - 1), period);

  // Calculate RSI
  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

/**
 * Calculate MACD
 */
export const calculateMACD = (
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } => {
  const ema12 = calculateEMA(data, fastPeriod);
  const ema26 = calculateEMA(data, slowPeriod);
  const macd = ema12 - ema26;

  // Calculate signal line (EMA of MACD)
  // For simplicity, we're using a single MACD value here
  // In a real implementation, you would calculate MACD for each data point
  // and then take the EMA of those MACD values
  const signal = macd * (2 / (signalPeriod + 1));

  const histogram = macd - signal;

  return { macd, signal, histogram };
};

/**
 * Calculate Bollinger Bands
 */
export const calculateBollingerBands = (
  data: number[],
  period: number = 20,
  stdDev: number = 2
): {
  upper: number;
  middle: number;
  lower: number;
} => {
  const sma = calculateSMA(data.slice(-period), period);
  const variance =
    data.slice(-period).reduce((sum, value) => sum + Math.pow(value - sma, 2), 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: sma + stdDev * std,
    middle: sma,
    lower: sma - stdDev * std,
  };
};

/**
 * Calculate if there's a breakout
 */
export const calculateBreakout = (
  data: number[],
  lookbackPeriod: number,
  threshold: number
): { isBreakout: boolean; direction: 'up' | 'down' | null } => {
  if (data.length < lookbackPeriod + 1) {
    return { isBreakout: false, direction: null };
  }

  const currentPrice = data[data.length - 1];
  const priorData = data.slice(-lookbackPeriod - 1, -1);

  const highestPrice = Math.max(...priorData);
  const lowestPrice = Math.min(...priorData);

  const upperThreshold = highestPrice * (1 + threshold / 100);
  const lowerThreshold = lowestPrice * (1 - threshold / 100);

  if (currentPrice > upperThreshold) {
    return { isBreakout: true, direction: 'up' };
  } else if (currentPrice < lowerThreshold) {
    return { isBreakout: true, direction: 'down' };
  }

  return { isBreakout: false, direction: null };
};

/**
 * Calculate Volume Weighted Average Price (VWAP)
 */
export const calculateVWAP = (data: MarketData[]): number => {
  let sumPV = 0;
  let sumV = 0;

  data.forEach(candle => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    sumPV += typicalPrice * candle.volume;
    sumV += candle.volume;
  });

  return sumPV / sumV;
};

/**
 * Calculate Ichimoku Cloud components
 */
export const calculateIchimoku = (
  data: number[],
  conversionPeriod: number = 9,
  basePeriod: number = 26,
  laggingSpanPeriod: number = 52,
  displacement: number = 26
): {
  conversionLine: number;
  baseLine: number;
  leadingSpanA: number;
  leadingSpanB: number;
  laggingSpan: number;
} => {
  if (data.length < Math.max(conversionPeriod, basePeriod, laggingSpanPeriod) + displacement) {
    return {
      conversionLine: 0,
      baseLine: 0,
      leadingSpanA: 0,
      leadingSpanB: 0,
      laggingSpan: 0,
    };
  }

  // Calculate Tenkan-sen (Conversion Line): (highest high + lowest low) / 2 for the past conversionPeriod
  const conversionHighs = data.slice(-conversionPeriod).map(price => price);
  const conversionLows = data.slice(-conversionPeriod).map(price => price);
  const conversionLine = (Math.max(...conversionHighs) + Math.min(...conversionLows)) / 2;

  // Calculate Kijun-sen (Base Line): (highest high + lowest low) / 2 for the past basePeriod
  const baseHighs = data.slice(-basePeriod).map(price => price);
  const baseLows = data.slice(-basePeriod).map(price => price);
  const baseLine = (Math.max(...baseHighs) + Math.min(...baseLows)) / 2;

  // Calculate Senkou Span A (Leading Span A): (Conversion Line + Base Line) / 2, plotted displacement periods ahead
  const leadingSpanA = (conversionLine + baseLine) / 2;

  // Calculate Senkou Span B (Leading Span B): (highest high + lowest low) / 2 for the past laggingSpanPeriod, plotted displacement periods ahead
  const spanBHighs = data.slice(-laggingSpanPeriod).map(price => price);
  const spanBLows = data.slice(-laggingSpanPeriod).map(price => price);
  const leadingSpanB = (Math.max(...spanBHighs) + Math.min(...spanBLows)) / 2;

  // Calculate Chikou Span (Lagging Span): Current closing price, plotted displacement periods behind
  const laggingSpan = data[data.length - 1 - displacement] || 0;

  return {
    conversionLine,
    baseLine,
    leadingSpanA,
    leadingSpanB,
    laggingSpan,
  };
};

/**
 * Detect candlestick patterns
 */
export const detectCandlestickPatterns = (
  data: MarketData[],
  patterns: string[] = ['doji', 'hammer', 'engulfing', 'morningstar', 'eveningstar']
): {
  pattern: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}[] => {
  if (data.length < 5) return [];

  const results: {
    pattern: string;
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  }[] = [];

  // Get the last few candles
  const candles = data.slice(-5);

  // Check for Doji pattern (open and close are very close)
  if (patterns.includes('doji')) {
    const lastCandle = candles[candles.length - 1];
    const bodySize = Math.abs(lastCandle.close - lastCandle.open);
    const totalRange = lastCandle.high - lastCandle.low;

    if (bodySize / totalRange < 0.1 && totalRange > 0) {
      results.push({
        pattern: 'doji',
        direction: 'neutral',
        strength: 0.5,
      });
    }
  }

  // Check for Hammer pattern (small body, long lower shadow, little or no upper shadow)
  if (patterns.includes('hammer')) {
    const lastCandle = candles[candles.length - 1];
    const bodySize = Math.abs(lastCandle.close - lastCandle.open);
    const totalRange = lastCandle.high - lastCandle.low;
    const lowerShadow = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
    const upperShadow = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);

    if (
      bodySize / totalRange < 0.3 &&
      lowerShadow / totalRange > 0.6 &&
      upperShadow / totalRange < 0.1
    ) {
      results.push({
        pattern: 'hammer',
        direction: 'bullish',
        strength: 0.7,
      });
    }
  }

  // Check for Bullish Engulfing pattern
  if (patterns.includes('engulfing') && candles.length >= 2) {
    const prevCandle = candles[candles.length - 2];
    const lastCandle = candles[candles.length - 1];

    if (
      prevCandle.close < prevCandle.open && // Previous candle is bearish
      lastCandle.close > lastCandle.open && // Current candle is bullish
      lastCandle.open < prevCandle.close && // Current open is below previous close
      lastCandle.close > prevCandle.open // Current close is above previous open
    ) {
      results.push({
        pattern: 'bullish engulfing',
        direction: 'bullish',
        strength: 0.8,
      });
    }

    // Check for Bearish Engulfing pattern
    if (
      prevCandle.close > prevCandle.open && // Previous candle is bullish
      lastCandle.close < lastCandle.open && // Current candle is bearish
      lastCandle.open > prevCandle.close && // Current open is above previous close
      lastCandle.close < prevCandle.open // Current close is below previous open
    ) {
      results.push({
        pattern: 'bearish engulfing',
        direction: 'bearish',
        strength: 0.8,
      });
    }
  }

  // Check for Morning Star pattern (requires 3 candles)
  if (patterns.includes('morningstar') && candles.length >= 3) {
    const firstCandle = candles[candles.length - 3];
    const middleCandle = candles[candles.length - 2];
    const lastCandle = candles[candles.length - 1];

    const firstCandleBody = Math.abs(firstCandle.close - firstCandle.open);
    const middleCandleBody = Math.abs(middleCandle.close - middleCandle.open);
    const lastCandleBody = Math.abs(lastCandle.close - lastCandle.open);

    if (
      firstCandle.close < firstCandle.open && // First candle is bearish
      firstCandleBody > middleCandleBody && // First candle has larger body than middle
      Math.max(middleCandle.open, middleCandle.close) < firstCandle.close && // Middle candle is lower than first
      lastCandle.close > lastCandle.open && // Last candle is bullish
      lastCandle.close > middleCandle.high // Last candle closes above middle candle
    ) {
      results.push({
        pattern: 'morning star',
        direction: 'bullish',
        strength: 0.9,
      });
    }
  }

  // Check for Evening Star pattern (requires 3 candles)
  if (patterns.includes('eveningstar') && candles.length >= 3) {
    const firstCandle = candles[candles.length - 3];
    const middleCandle = candles[candles.length - 2];
    const lastCandle = candles[candles.length - 1];

    const firstCandleBody = Math.abs(firstCandle.close - firstCandle.open);
    const middleCandleBody = Math.abs(middleCandle.close - middleCandle.open);
    const lastCandleBody = Math.abs(lastCandle.close - lastCandle.open);

    if (
      firstCandle.close > firstCandle.open && // First candle is bullish
      firstCandleBody > middleCandleBody && // First candle has larger body than middle
      Math.min(middleCandle.open, middleCandle.close) > firstCandle.close && // Middle candle is higher than first
      lastCandle.close < lastCandle.open && // Last candle is bearish
      lastCandle.close < middleCandle.low // Last candle closes below middle candle
    ) {
      results.push({
        pattern: 'evening star',
        direction: 'bearish',
        strength: 0.9,
      });
    }
  }

  return results;
};

/**
 * Execute a strategy based on current market data
 */
export const executeStrategy = (
  strategy: Strategy,
  marketData: MarketData[]
): { signal: 'BUY' | 'SELL' | null; reason: string } => {
  // Filter market data for the relevant pair
  const pairData = marketData.filter(data => data.pair === strategy.parameters.pair);

  if (pairData.length === 0) {
    return { signal: null, reason: 'No market data available for this pair.' };
  }

  // Extract closing prices
  const prices = pairData.map(data => data.close);

  switch (strategy.type) {
    case StrategyType.MA_CROSSOVER: {
      const { shortPeriod, longPeriod } = strategy.parameters;

      if (prices.length < longPeriod) {
        return {
          signal: null,
          reason: `Not enough data. Need at least ${longPeriod} periods`,
        };
      }

      const shortMA = calculateSMA(prices, shortPeriod);
      const longMA = calculateSMA(prices, longPeriod);

      // Check for previous values to determine crossing
      const prevPrices = prices.slice(0, -1);
      const prevShortMA = calculateSMA(prevPrices, shortPeriod);
      const prevLongMA = calculateSMA(prevPrices, longPeriod);

      if (prevShortMA <= prevLongMA && shortMA > longMA) {
        return {
          signal: 'BUY',
          reason: `Short MA (${shortMA.toFixed(2)}) crossed above Long MA (${longMA.toFixed(2)})`,
        };
      } else if (prevShortMA >= prevLongMA && shortMA < longMA) {
        return {
          signal: 'SELL',
          reason: `Short MA (${shortMA.toFixed(2)}) crossed below Long MA (${longMA.toFixed(2)})`,
        };
      }

      return {
        signal: null,
        reason: `No signal. Short MA: ${shortMA.toFixed(2)}, Long MA: ${longMA.toFixed(2)}`,
      };
    }

    case StrategyType.RSI: {
      const { period, overbought, oversold } = strategy.parameters;

      if (prices.length < period) {
        return {
          signal: null,
          reason: `Not enough data. Need at least ${period} periods.`,
        };
      }

      const rsi = calculateRSI(prices, period);
      const prevPrices = prices.slice(0, -1);
      const prevRSI = calculateRSI(prevPrices, period);

      if (prevRSI <= oversold && rsi > oversold) {
        return {
          signal: 'BUY',
          reason: `RSI (${rsi.toFixed(2)}) crossed above oversold threshold (${oversold})`,
        };
      } else if (prevRSI >= overbought && rsi < overbought) {
        return {
          signal: 'SELL',
          reason: `RSI (${rsi.toFixed(2)}) crossed below overbought threshold (${overbought})`,
        };
      }

      return {
        signal: null,
        reason: `No signal. RSI: ${rsi.toFixed(2)}`,
      };
    }

    case StrategyType.BREAKOUT: {
      const { lookbackPeriod, breakoutThreshold } = strategy.parameters;

      if (prices.length < lookbackPeriod) {
        return {
          signal: null,
          reason: `Not enough data. Need at least ${lookbackPeriod} periods.`,
        };
      }

      const { isBreakout, direction } = calculateBreakout(
        prices,
        lookbackPeriod,
        breakoutThreshold
      );

      if (isBreakout && direction === 'up') {
        return {
          signal: 'BUY',
          reason: `Upward breakout detected (${breakoutThreshold}% threshold)`,
        };
      } else if (isBreakout && direction === 'down') {
        return {
          signal: 'SELL',
          reason: `Downward breakout detected (${breakoutThreshold}% threshold)`,
        };
      }

      return {
        signal: null,
        reason: 'No breakout detected',
      };
    }

    case StrategyType.MACD: {
      const { fastPeriod, slowPeriod, signalPeriod } = strategy.parameters;

      if (prices.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
        return {
          signal: null,
          reason: `Not enough data. Need at least ${Math.max(fastPeriod, slowPeriod) + signalPeriod} periods.`,
        };
      }

      // Calculate current MACD
      const { macd, signal, histogram } = calculateMACD(
        prices,
        fastPeriod,
        slowPeriod,
        signalPeriod
      );

      // Calculate previous MACD
      const prevPrices = prices.slice(0, -1);
      const prevResult = calculateMACD(prevPrices, fastPeriod, slowPeriod, signalPeriod);
      const prevHistogram = prevResult.histogram;

      // MACD crossing above signal line (histogram turns positive)
      if (prevHistogram <= 0 && histogram > 0) {
        return {
          signal: 'BUY',
          reason: `MACD histogram turned positive (${histogram.toFixed(2)})`,
        };
      }

      // MACD crossing below signal line (histogram turns negative)
      if (prevHistogram >= 0 && histogram < 0) {
        return {
          signal: 'SELL',
          reason: `MACD histogram turned negative (${histogram.toFixed(2)})`,
        };
      }

      return {
        signal: null,
        reason: `No signal. MACD: ${macd.toFixed(2)}, Signal: ${signal.toFixed(2)}, Histogram: ${histogram.toFixed(2)}`,
      };
    }

    case StrategyType.BOLLINGER_BANDS: {
      const { period, standardDeviations } = strategy.parameters;

      if (prices.length < period) {
        return {
          signal: null,
          reason: `Not enough data. Need at least ${period} periods.`,
        };
      }

      // Calculate Bollinger Bands
      const bands = calculateBollingerBands(prices, period, standardDeviations);
      const currentPrice = prices[prices.length - 1];

      // Price crossing below lower band
      if (currentPrice <= bands.lower) {
        return {
          signal: 'BUY',
          reason: `Price (${currentPrice.toFixed(2)}) at or below lower Bollinger Band (${bands.lower.toFixed(2)})`,
        };
      }

      // Price crossing above upper band
      if (currentPrice >= bands.upper) {
        return {
          signal: 'SELL',
          reason: `Price (${currentPrice.toFixed(2)}) at or above upper Bollinger Band (${bands.upper.toFixed(2)})`,
        };
      }

      return {
        signal: null,
        reason: `No signal. Price: ${currentPrice.toFixed(2)}, Upper: ${bands.upper.toFixed(2)}, Middle: ${bands.middle.toFixed(2)}, Lower: ${bands.lower.toFixed(2)}`,
      };
    }

    case StrategyType.ICHIMOKU: {
      const { conversionPeriod, basePeriod, laggingSpanPeriod, displacement } = strategy.parameters;

      if (
        prices.length <
        Math.max(conversionPeriod, basePeriod, laggingSpanPeriod) + displacement
      ) {
        return {
          signal: null,
          reason: `Not enough data. Need at least ${Math.max(conversionPeriod, basePeriod, laggingSpanPeriod) + displacement} periods.`,
        };
      }

      // Calculate Ichimoku components
      const ichimoku = calculateIchimoku(
        prices,
        conversionPeriod,
        basePeriod,
        laggingSpanPeriod,
        displacement
      );

      const currentPrice = prices[prices.length - 1];

      // TK Cross (Tenkan-sen crosses above Kijun-sen)
      const prevPrices = prices.slice(0, -1);
      const prevIchimoku = calculateIchimoku(
        prevPrices,
        conversionPeriod,
        basePeriod,
        laggingSpanPeriod,
        displacement
      );

      if (
        prevIchimoku.conversionLine <= prevIchimoku.baseLine &&
        ichimoku.conversionLine > ichimoku.baseLine
      ) {
        return {
          signal: 'BUY',
          reason: `Tenkan-sen (${ichimoku.conversionLine.toFixed(2)}) crossed above Kijun-sen (${ichimoku.baseLine.toFixed(2)})`,
        };
      }

      if (
        prevIchimoku.conversionLine >= prevIchimoku.baseLine &&
        ichimoku.conversionLine < ichimoku.baseLine
      ) {
        return {
          signal: 'SELL',
          reason: `Tenkan-sen (${ichimoku.conversionLine.toFixed(2)}) crossed below Kijun-sen (${ichimoku.baseLine.toFixed(2)})`,
        };
      }

      // Price crossing above/below the cloud
      if (
        currentPrice > ichimoku.leadingSpanA &&
        currentPrice > ichimoku.leadingSpanB &&
        prices[prices.length - 2] <= Math.max(ichimoku.leadingSpanA, ichimoku.leadingSpanB)
      ) {
        return {
          signal: 'BUY',
          reason: `Price (${currentPrice.toFixed(2)}) crossed above the cloud`,
        };
      }

      if (
        currentPrice < ichimoku.leadingSpanA &&
        currentPrice < ichimoku.leadingSpanB &&
        prices[prices.length - 2] >= Math.min(ichimoku.leadingSpanA, ichimoku.leadingSpanB)
      ) {
        return {
          signal: 'SELL',
          reason: `Price (${currentPrice.toFixed(2)}) crossed below the cloud`,
        };
      }

      return {
        signal: null,
        reason: `No signal. Price: ${currentPrice.toFixed(2)}, Conversion: ${ichimoku.conversionLine.toFixed(2)}, Base: ${ichimoku.baseLine.toFixed(2)}`,
      };
    }

    case StrategyType.PATTERN_RECOGNITION: {
      const { patterns, confirmationPeriod } = strategy.parameters;

      if (pairData.length < 5) {
        return {
          signal: null,
          reason: `Not enough data. Need at least 5 candles for pattern recognition.`,
        };
      }

      // Detect candlestick patterns
      const patternResults = detectCandlestickPatterns(
        pairData,
        Array.isArray(patterns) ? patterns : [patterns as string]
      );

      if (patternResults.length > 0) {
        // Sort by strength (highest first)
        patternResults.sort((a, b) => b.strength - a.strength);

        const strongestPattern = patternResults[0];

        if (strongestPattern.direction === 'bullish' && strongestPattern.strength >= 0.7) {
          return {
            signal: 'BUY',
            reason: `${strongestPattern.pattern} pattern detected (${(strongestPattern.strength * 100).toFixed(0)}% confidence)`,
          };
        }

        if (strongestPattern.direction === 'bearish' && strongestPattern.strength >= 0.7) {
          return {
            signal: 'SELL',
            reason: `${strongestPattern.pattern} pattern detected (${(strongestPattern.strength * 100).toFixed(0)}% confidence)`,
          };
        }

        return {
          signal: null,
          reason: `${strongestPattern.pattern} pattern detected but signal strength (${(strongestPattern.strength * 100).toFixed(0)}%) below threshold`,
        };
      }

      return {
        signal: null,
        reason: 'No significant candlestick patterns detected',
      };
    }

    case StrategyType.MULTI_FACTOR: {
      const { strategies, weights, operator } = strategy.parameters;

      if (!Array.isArray(strategies) || strategies.length === 0) {
        return {
          signal: null,
          reason: 'No sub-strategies defined for multi-factor strategy',
        };
      }

      // Execute each sub-strategy
      const results: { signal: 'BUY' | 'SELL' | null; reason: string; weight: number }[] = [];

      for (let i = 0; i < strategies.length; i++) {
        const subStrategyId = strategies[i] as string;
        const weight = Array.isArray(weights) && weights.length > i ? (weights[i] as number) : 1;

        // This is a simplified implementation - in a real system, you would
        // look up the sub-strategy by ID and execute it
        // For now, we'll just use a placeholder
        const subStrategyResult = {
          signal: null as 'BUY' | 'SELL' | null,
          reason: 'Sub-strategy not found',
        };

        results.push({
          ...subStrategyResult,
          weight,
        });
      }

      // Apply the operator to combine signals
      if (operator === 'AND') {
        // All signals must agree
        const buySignals = results.filter(r => r.signal === 'BUY');
        const sellSignals = results.filter(r => r.signal === 'SELL');

        if (buySignals.length === results.length) {
          return {
            signal: 'BUY',
            reason: 'All sub-strategies agree on BUY signal',
          };
        }

        if (sellSignals.length === results.length) {
          return {
            signal: 'SELL',
            reason: 'All sub-strategies agree on SELL signal',
          };
        }
      } else if (operator === 'OR') {
        // Any signal is enough
        const buySignals = results.filter(r => r.signal === 'BUY');
        const sellSignals = results.filter(r => r.signal === 'SELL');

        if (buySignals.length > sellSignals.length) {
          return {
            signal: 'BUY',
            reason: `${buySignals.length} sub-strategies indicate BUY`,
          };
        }

        if (sellSignals.length > buySignals.length) {
          return {
            signal: 'SELL',
            reason: `${sellSignals.length} sub-strategies indicate SELL`,
          };
        }
      } else if (operator === 'WEIGHTED') {
        // Weight the signals
        let buyWeight = 0;
        let sellWeight = 0;

        results.forEach(result => {
          if (result.signal === 'BUY') {
            buyWeight += result.weight;
          } else if (result.signal === 'SELL') {
            sellWeight += result.weight;
          }
        });

        if (buyWeight > sellWeight) {
          return {
            signal: 'BUY',
            reason: `Weighted sub-strategies favor BUY (${buyWeight.toFixed(2)} vs ${sellWeight.toFixed(2)})`,
          };
        }

        if (sellWeight > buyWeight) {
          return {
            signal: 'SELL',
            reason: `Weighted sub-strategies favor SELL (${sellWeight.toFixed(2)} vs ${buyWeight.toFixed(2)})`,
          };
        }
      }

      return {
        signal: null,
        reason: 'No clear signal from multi-factor strategy',
      };
    }

    default:
      return { signal: null, reason: 'Unknown strategy type.' };
  }
};

/**
 * Combine multiple strategies into a single strategy
 */
export const combineStrategies = (
  strategies: Strategy[],
  combinationRule: 'AND' | 'OR' | 'WEIGHTED',
  weights?: number[]
): Strategy => {
  if (strategies.length === 0) {
    throw new Error('No strategies provided to combine');
  }

  // Use the first strategy's pair for the combined strategy
  const pair = strategies[0].parameters.pair;

  // Create a multi-factor strategy
  return {
    id: `combined_${Date.now()}`,
    name: `Combined Strategy (${combinationRule})`,
    type: StrategyType.MULTI_FACTOR,
    parameters: {
      pair,
      strategies: strategies.map(s => s.id),
      weights: weights || strategies.map(() => 1),
      operator: combinationRule,
    },
    created: new Date().toISOString(),
  };
};

/**
 * Apply a filter to a strategy
 */
export const applyFilter = (strategy: Strategy, filter: any): any => {
  // This is a placeholder for a more complex implementation
  return {
    ...strategy,
    filters: [...(strategy.filters || []), filter],
  };
};
