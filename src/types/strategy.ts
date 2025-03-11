// Define StrategyType enum here to avoid circular dependencies
export enum StrategyType {
  MA_CROSSOVER = 'MA_CROSSOVER',
  RSI = 'RSI',
  BREAKOUT = 'BREAKOUT',
  MACD = 'MACD',
  BOLLINGER_BANDS = 'BOLLINGER_BANDS',
  ICHIMOKU = 'ICHIMOKU',
  MULTI_FACTOR = 'MULTI_FACTOR',
  PATTERN_RECOGNITION = 'PATTERN_RECOGNITION',
}

export interface StrategyParameters {
  [key: string]: number | string | boolean;
  pair: string;
}

export interface MACrossoverParameters extends StrategyParameters {
  shortPeriod: number;
  longPeriod: number;
}

export interface RSIParameters extends StrategyParameters {
  period: number;
  overbought: number;
  oversold: number;
}

export interface BreakoutParameters extends StrategyParameters {
  lookbackPeriod: number;
  breakoutThreshold: number;
}

export interface MACDParameters extends StrategyParameters {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export interface BollingerBandsParameters extends StrategyParameters {
  period: number;
  standardDeviations: number;
}

export interface IchimokuParameters extends StrategyParameters {
  conversionPeriod: number;
  basePeriod: number;
  laggingSpanPeriod: number;
  displacement: number;
}

export interface PatternRecognitionParameters extends StrategyParameters {
  patterns: string[];
  confirmationPeriod: number;
}

export interface MultiFactorParameters extends StrategyParameters {
  strategies: string[];
  weights: number[];
  operator: 'AND' | 'OR' | 'WEIGHTED';
}

export interface StrategyPerformance {
  totalPnL: number;
  winRate: number;
  tradesCount: number;
}

export interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  parameters: StrategyParameters;
  created: string;
  performance?: StrategyPerformance;
}

export interface Filter {
  type: 'TIME_FILTER' | 'VOLATILITY_FILTER' | 'VOLUME_FILTER' | 'TREND_FILTER';
  parameters: {
    [key: string]: number | string | boolean;
  };
}

export interface StrategyWithFilters extends Strategy {
  filters: Filter[];
}
