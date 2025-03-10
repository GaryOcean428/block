// Define StrategyType enum here to avoid circular dependencies
export enum StrategyType {
  MA_CROSSOVER = 'MA_CROSSOVER',
  RSI = 'RSI',
  BREAKOUT = 'BREAKOUT',
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
