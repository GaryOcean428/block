/**
 * Historical market data for testing and backtesting
 * Based on real price data from various crypto markets
 */

export interface MarketCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generate realistic historical market data for backtesting
export async function getHistoricalMarketData(
  pair: string,
  startDate: Date,
  endDate: Date,
  interval: '1h' | '4h' | '1d' = '1d'
): Promise<MarketCandle[]> {
  // Use base data - this is BTC/USDT daily data from 2022-2023
  // In a real implementation, this would be fetched from an API or database
  const baseData = getBTCUSDTData();

  // Filter data by date range
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const filteredData = baseData.filter(
    candle => candle.timestamp >= startTime && candle.timestamp <= endTime
  );

  // Handle different pairs by applying a transformation to BTC/USDT data
  if (pair.toUpperCase() !== 'BTC/USDT' && pair.toUpperCase() !== 'BTC-USDT') {
    return transformMarketData(filteredData, pair);
  }

  return filteredData;
}

// Transform base BTC/USDT data to simulate other crypto pairs
function transformMarketData(data: MarketCandle[], pair: string): MarketCandle[] {
  // Extract first token from the pair (e.g. ETH from ETH/USDT)
  const token = pair.split('/')[0]?.split('-')[0]?.toUpperCase() || 'ETH';

  // Define transformation factors for common tokens
  const transformations: Record<
    string,
    {
      priceFactor: number;
      volatilityFactor: number;
      volumeFactor: number;
      trendShift: number;
    }
  > = {
    ETH: { priceFactor: 0.06, volatilityFactor: 1.1, volumeFactor: 0.8, trendShift: -5 },
    XRP: { priceFactor: 0.00002, volatilityFactor: 1.2, volumeFactor: 1.5, trendShift: 10 },
    SOL: { priceFactor: 0.01, volatilityFactor: 1.4, volumeFactor: 0.7, trendShift: 15 },
    DOGE: { priceFactor: 0.000005, volatilityFactor: 1.6, volumeFactor: 2.0, trendShift: 20 },
    ADA: { priceFactor: 0.0002, volatilityFactor: 1.1, volumeFactor: 0.9, trendShift: 0 },
    DOT: { priceFactor: 0.005, volatilityFactor: 1.2, volumeFactor: 0.5, trendShift: -10 },
    MATIC: { priceFactor: 0.0005, volatilityFactor: 1.3, volumeFactor: 0.7, trendShift: 5 },
    BNB: { priceFactor: 0.13, volatilityFactor: 0.9, volumeFactor: 0.6, trendShift: -3 },
    LTC: { priceFactor: 0.03, volatilityFactor: 1.0, volumeFactor: 0.5, trendShift: -8 },
    LINK: { priceFactor: 0.007, volatilityFactor: 1.2, volumeFactor: 0.6, trendShift: 2 },
  };

  // Use ETH as default if token not in our mapping
  const transformation = transformations[token] || transformations['ETH'];

  // Add some randomness to make the transformation less predictable
  const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 - 1.1

  // Apply transformation to create a derivative dataset
  return data.map((candle, index) => {
    // Apply base price factor
    const priceFactor = transformation.priceFactor * randomFactor;

    // Apply volatility factor (impacts high-low range)
    const volatilityFactor = transformation.volatilityFactor * randomFactor;

    // Apply volume factor
    const volumeFactor = transformation.volumeFactor * randomFactor;

    // Apply trend shift by adding a progressive factor
    const trendShiftFactor = 1 + (transformation.trendShift / 1000) * (index / data.length);

    // If it's the first candle, just apply the transformations directly
    if (index === 0) {
      const basePrice = candle.close * priceFactor * trendShiftFactor;
      const range = (candle.high - candle.low) * priceFactor * volatilityFactor;

      return {
        timestamp: candle.timestamp,
        open: basePrice * (1 - 0.01),
        high: basePrice + range / 2,
        low: basePrice - range / 2,
        close: basePrice,
        volume: candle.volume * volumeFactor,
      };
    }

    // For subsequent candles, use the previous candle's close as a reference
    // This creates more realistic price movement
    const prevTransformedCandle = data[index - 1];
    const priceChange = candle.close / prevTransformedCandle.close;
    const basePrice = data[index - 1].close * priceChange * trendShiftFactor;
    const range = (candle.high - candle.low) * priceFactor * volatilityFactor;

    return {
      timestamp: candle.timestamp,
      open: data[index - 1].close,
      high: basePrice + range / 2,
      low: basePrice - range / 2,
      close: basePrice,
      volume: candle.volume * volumeFactor,
    };
  });
}

// Real BTC/USDT daily data from 2022-2023
function getBTCUSDTData(): MarketCandle[] {
  return [
    // Sample of real BTC/USDT data, 365 days of data
    {
      timestamp: 1640995200000,
      open: 46217.5,
      high: 47989.7,
      low: 46217.5,
      close: 47686.8,
      volume: 33768.37,
    },
    {
      timestamp: 1641081600000,
      open: 47686.8,
      high: 47992.1,
      low: 46530.0,
      close: 47345.3,
      volume: 27013.44,
    },
    {
      timestamp: 1641168000000,
      open: 47345.3,
      high: 47570.0,
      low: 45855.7,
      close: 46458.1,
      volume: 32380.85,
    },
    {
      timestamp: 1641254400000,
      open: 46458.2,
      high: 47570.0,
      low: 45752.0,
      close: 45900.6,
      volume: 31930.92,
    },
    {
      timestamp: 1641340800000,
      open: 45900.8,
      high: 47030.0,
      low: 45816.0,
      close: 46422.5,
      volume: 32497.18,
    },
    {
      timestamp: 1641427200000,
      open: 46429.9,
      high: 46784.9,
      low: 43304.9,
      close: 43565.5,
      volume: 57466.8,
    },
    {
      timestamp: 1641513600000,
      open: 43565.5,
      high: 43708.0,
      low: 41018.2,
      close: 41557.9,
      volume: 54939.32,
    },
    {
      timestamp: 1641600000000,
      open: 41557.9,
      high: 42518.0,
      low: 40672.5,
      close: 41733.9,
      volume: 28275.82,
    },
    {
      timestamp: 1641686400000,
      open: 41733.9,
      high: 42786.8,
      low: 41167.5,
      close: 41864.8,
      volume: 29325.83,
    },
    {
      timestamp: 1641772800000,
      open: 41864.8,
      high: 42345.1,
      low: 39825.4,
      close: 41815.0,
      volume: 48614.48,
    },
    {
      timestamp: 1641859200000,
      open: 41807.1,
      high: 43127.5,
      low: 41288.7,
      close: 42735.9,
      volume: 32770.19,
    },
    {
      timestamp: 1641945600000,
      open: 42734.4,
      high: 44200.0,
      low: 42525.9,
      close: 43949.1,
      volume: 34736.35,
    },
    {
      timestamp: 1642032000000,
      open: 43949.7,
      high: 44199.2,
      low: 42422.2,
      close: 42591.6,
      volume: 32204.24,
    },
    {
      timestamp: 1642118400000,
      open: 42585.5,
      high: 43158.4,
      low: 41635.8,
      close: 43099.7,
      volume: 28591.68,
    },
    {
      timestamp: 1642204800000,
      open: 43092.6,
      high: 43990.5,
      low: 42662.0,
      close: 43178.1,
      volume: 24397.74,
    },
    // ... more data would be here
    // Data trimmed for brevity, but in real implementation would include full year
    {
      timestamp: 1672444800000,
      open: 16547.5,
      high: 16612.0,
      low: 16512.0,
      close: 16602.3,
      volume: 14389.36,
    },
    {
      timestamp: 1672531200000,
      open: 16602.3,
      high: 16755.0,
      low: 16542.0,
      close: 16625.4,
      volume: 15713.53,
    },
    {
      timestamp: 1672617600000,
      open: 16625.4,
      high: 16759.1,
      low: 16583.0,
      close: 16681.0,
      volume: 14479.02,
    },
    {
      timestamp: 1672704000000,
      open: 16679.9,
      high: 16760.0,
      low: 16620.0,
      close: 16679.0,
      volume: 16730.63,
    },
    {
      timestamp: 1672790400000,
      open: 16673.4,
      high: 16796.0,
      low: 16666.0,
      close: 16863.1,
      volume: 20011.35,
    },
    {
      timestamp: 1672876800000,
      open: 16863.1,
      high: 16884.6,
      low: 16748.4,
      close: 16831.5,
      volume: 20050.38,
    },
    {
      timestamp: 1672963200000,
      open: 16831.5,
      high: 16991.0,
      low: 16726.0,
      close: 16951.9,
      volume: 18536.03,
    },
    {
      timestamp: 1673049600000,
      open: 16953.8,
      high: 17041.0,
      low: 16909.0,
      close: 16962.5,
      volume: 13520.46,
    },
    {
      timestamp: 1673136000000,
      open: 16962.5,
      high: 17091.0,
      low: 16920.0,
      close: 17075.5,
      volume: 10979.58,
    },
    {
      timestamp: 1673222400000,
      open: 17075.5,
      high: 17396.0,
      low: 17038.9,
      close: 17192.9,
      volume: 24269.64,
    },
    {
      timestamp: 1673308800000,
      open: 17193.3,
      high: 17484.0,
      low: 17125.0,
      close: 17422.0,
      volume: 26611.26,
    },
    {
      timestamp: 1673395200000,
      open: 17421.9,
      high: 18000.0,
      low: 17260.0,
      close: 17932.3,
      volume: 45649.93,
    },
  ];
}

// Function to generate realistic trade data for tests
export function generateTradeData(
  strategyId: string,
  pair: string,
  count: number
): {
  id: string;
  strategyId: string;
  pair: string;
  timestamp: number;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  total: number;
  pnl: number;
  pnlPercent: number;
  status: string;
}[] {
  const trades = [];
  const now = Date.now();
  const basePrice = pair.includes('BTC') ? 35000 : pair.includes('ETH') ? 2000 : 100;

  let currentPrice = basePrice;
  let position: {
    entry: number;
    amount: number;
    type: 'BUY' | 'SELL';
    entryTimestamp: number;
  } | null = null;

  for (let i = 0; i < count; i++) {
    // Generate realistic price movements
    const priceChange = (Math.random() - 0.45) * (basePrice * 0.02); // Slight upward bias
    currentPrice = Math.max(0.01, currentPrice + priceChange);

    // Timestamp for the trade, going back in time
    const timestamp = now - (count - i) * 3600000; // Hourly trades

    if (position === null) {
      // Create a new position
      const amount = 0.1 + Math.random() * 0.5; // Random amount
      position = {
        entry: currentPrice,
        amount,
        type: Math.random() > 0.5 ? 'BUY' : 'SELL',
        entryTimestamp: timestamp,
      };

      trades.push({
        id: `trade-${i}`,
        strategyId,
        pair,
        timestamp,
        type: position.type,
        price: currentPrice,
        amount: position.amount,
        total: currentPrice * position.amount,
        pnl: 0,
        pnlPercent: 0,
        status: 'COMPLETED',
      });
    } else {
      // Close the position
      const exitType = position.type === 'BUY' ? 'SELL' : 'BUY';
      let pnl = 0;
      let pnlPercent = 0;

      if (position.type === 'BUY') {
        pnl = (currentPrice - position.entry) * position.amount;
        pnlPercent = (currentPrice / position.entry - 1) * 100;
      } else {
        pnl = (position.entry - currentPrice) * position.amount;
        pnlPercent = (position.entry / currentPrice - 1) * 100;
      }

      trades.push({
        id: `trade-${i}`,
        strategyId,
        pair,
        timestamp,
        type: exitType,
        price: currentPrice,
        amount: position.amount,
        total: currentPrice * position.amount,
        pnl,
        pnlPercent,
        status: 'COMPLETED',
      });

      // Reset position
      position = null;
    }
  }

  return trades;
}
