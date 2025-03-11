import React, { useState } from 'react';
import { StrategyType, type Strategy } from '../../types/strategy';
import { type BacktestResult } from '../../types';
import PriceChart from '../charts/PriceChart';
import PerformanceChart from '../charts/PerformanceChart';
import { useTradingContext } from '../../hooks/useTradingContext';
import {
  Clock,
  Zap,
  BarChart2,
  History,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Activity,
  Cloud,
  Layers,
  CandlestickChart,
} from 'lucide-react';

interface StrategyDetailsProps {
  strategy: Strategy;
  backtestResults?: BacktestResult | null;
  isBacktesting?: boolean;
  isOptimizing?: boolean;
}

const StrategyDetails: React.FC<StrategyDetailsProps> = ({
  strategy,
  backtestResults,
  isBacktesting,
  isOptimizing,
}) => {
  const { marketData } = useTradingContext();
  const [timeframe, setTimeframe] = React.useState<'1h' | '4h' | '1d'>('1h');
  const [chartType, setChartType] = React.useState<'candlestick' | 'line'>('candlestick');

  const getStrategyTypeIcon = (type: StrategyType) => {
    switch (type) {
      case StrategyType.MA_CROSSOVER:
        return <Zap className="h-6 w-6 text-blue-500" />;
      case StrategyType.RSI:
        return <BarChart2 className="h-6 w-6 text-purple-500" />;
      case StrategyType.BREAKOUT:
        return <RefreshCw className="h-6 w-6 text-orange-500" />;
      case StrategyType.MACD:
        return <Activity className="h-6 w-6 text-green-500" />;
      case StrategyType.BOLLINGER_BANDS:
        return <TrendingUp className="h-6 w-6 text-indigo-500" />;
      case StrategyType.ICHIMOKU:
        return <Cloud className="h-6 w-6 text-red-500" />;
      case StrategyType.PATTERN_RECOGNITION:
        return <CandlestickChart className="h-6 w-6 text-yellow-500" />;
      case StrategyType.MULTI_FACTOR:
        return <Layers className="h-6 w-6 text-teal-500" />;
      default:
        return <Zap className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStrategyTypeName = (type: StrategyType) => {
    switch (type) {
      case StrategyType.MA_CROSSOVER:
        return 'Moving Average Crossover';
      case StrategyType.RSI:
        return 'Relative Strength Index (RSI)';
      case StrategyType.BREAKOUT:
        return 'Breakout';
      case StrategyType.MACD:
        return 'Moving Average Convergence Divergence (MACD)';
      case StrategyType.BOLLINGER_BANDS:
        return 'Bollinger Bands';
      case StrategyType.ICHIMOKU:
        return 'Ichimoku Cloud';
      case StrategyType.PATTERN_RECOGNITION:
        return 'Candlestick Pattern Recognition';
      case StrategyType.MULTI_FACTOR:
        return 'Multi-Factor Strategy';
      default:
        return type;
    }
  };

  const getStrategyDescription = (type: StrategyType) => {
    switch (type) {
      case StrategyType.MA_CROSSOVER:
        return 'This strategy generates signals when the short-term moving average crosses the long-term moving average. A buy signal is generated when the short MA crosses above the long MA, and a sell signal when it crosses below.';
      case StrategyType.RSI:
        return 'The RSI strategy measures the magnitude of recent price changes to evaluate overbought or oversold conditions. It generates buy signals when RSI crosses above the oversold threshold and sell signals when it crosses below the overbought threshold.';
      case StrategyType.BREAKOUT:
        return 'The Breakout strategy identifies significant price movements beyond established support and resistance levels. It generates buy signals when the price breaks above resistance and sell signals when it breaks below support.';
      case StrategyType.MACD:
        return 'The MACD strategy uses the difference between two exponential moving averages to identify changes in momentum. It generates buy signals when the MACD line crosses above the signal line and sell signals when it crosses below.';
      case StrategyType.BOLLINGER_BANDS:
        return 'The Bollinger Bands strategy uses standard deviations to create dynamic support and resistance levels. It generates buy signals when price touches the lower band and sell signals when it touches the upper band.';
      case StrategyType.ICHIMOKU:
        return 'The Ichimoku Cloud strategy is a comprehensive indicator that provides support/resistance levels, momentum, and trend direction. It generates buy signals when price crosses above the cloud and sell signals when it crosses below.';
      case StrategyType.PATTERN_RECOGNITION:
        return 'The Pattern Recognition strategy identifies specific candlestick patterns that may indicate reversals or continuations. It generates buy signals on bullish patterns and sell signals on bearish patterns.';
      case StrategyType.MULTI_FACTOR:
        return 'The Multi-Factor strategy combines multiple trading strategies to generate more robust signals. It uses a weighted approach to consider signals from different strategies and reduce false positives.';
      default:
        return 'Custom trading strategy.';
    }
  };

  const renderParameters = () => {
    switch (strategy.type) {
      case StrategyType.MA_CROSSOVER:
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Short Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.shortPeriod}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Long Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.longPeriod}</div>
            </div>
          </div>
        );
      case StrategyType.RSI:
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.period}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Overbought</div>
              <div className="text-lg font-semibold">{strategy.parameters.overbought}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Oversold</div>
              <div className="text-lg font-semibold">{strategy.parameters.oversold}</div>
            </div>
          </div>
        );
      case StrategyType.BREAKOUT:
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Lookback Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.lookbackPeriod}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Breakout Threshold</div>
              <div className="text-lg font-semibold">{strategy.parameters.breakoutThreshold}%</div>
            </div>
          </div>
        );
      case StrategyType.MACD:
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Fast Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.fastPeriod}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Slow Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.slowPeriod}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Signal Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.signalPeriod}</div>
            </div>
          </div>
        );
      case StrategyType.BOLLINGER_BANDS:
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.period}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Standard Deviations</div>
              <div className="text-lg font-semibold">{strategy.parameters.standardDeviations}</div>
            </div>
          </div>
        );
      case StrategyType.ICHIMOKU:
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Conversion Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.conversionPeriod}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Base Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.basePeriod}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Lagging Span Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.laggingSpanPeriod}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Displacement</div>
              <div className="text-lg font-semibold">{strategy.parameters.displacement}</div>
            </div>
          </div>
        );
      case StrategyType.PATTERN_RECOGNITION:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Patterns</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {Array.isArray(strategy.parameters.patterns) ? (
                  strategy.parameters.patterns.map((pattern, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm"
                    >
                      {pattern}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                    {strategy.parameters.patterns}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Confirmation Period</div>
              <div className="text-lg font-semibold">{strategy.parameters.confirmationPeriod}</div>
            </div>
          </div>
        );
      case StrategyType.MULTI_FACTOR:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Combination Method</div>
              <div className="text-lg font-semibold">{strategy.parameters.operator}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">Sub-Strategies</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {Array.isArray(strategy.parameters.strategies) ? (
                  strategy.parameters.strategies.map((strategyId, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-sm"
                    >
                      {strategyId}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-sm">
                    {strategy.parameters.strategies}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center">
          <div className="mr-4">{getStrategyTypeIcon(strategy.type)}</div>
          <div>
            <h2 className="text-xl font-bold">{strategy.name}</h2>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <span>{getStrategyTypeName(strategy.type)}</span>
              <span className="mx-2">•</span>
              <span>{strategy.parameters.pair}</span>
              <span className="mx-2">•</span>
              <Clock className="h-4 w-4 mr-1" />
              <span>Created {new Date(strategy.created).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          {isBacktesting && (
            <div className="flex items-center text-blue-600">
              <History className="h-4 w-4 mr-1 animate-spin" />
              <span>Backtesting...</span>
            </div>
          )}
          {isOptimizing && (
            <div className="flex items-center text-purple-600">
              <Sparkles className="h-4 w-4 mr-1 animate-spin" />
              <span>Optimizing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-gray-700 mb-4">{getStrategyDescription(strategy.type)}</div>
        {renderParameters()}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Performance</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {strategy.performance && (
            <>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-500">Total P&L</div>
                <div
                  className={`text-lg font-semibold ${
                    strategy.performance.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {strategy.performance.totalPnL.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-500">Win Rate</div>
                <div className="text-lg font-semibold">
                  {(strategy.performance.winRate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-500">Total Trades</div>
                <div className="text-lg font-semibold">{strategy.performance.tradesCount}</div>
              </div>
            </>
          )}
        </div>

        {backtestResults && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Backtest Results</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Initial Balance</div>
                <div className="font-medium">${backtestResults.initialBalance.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Final Balance</div>
                <div className="font-medium">${backtestResults.finalBalance.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Trades</div>
                <div className="font-medium">{backtestResults.totalTrades}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Win Rate</div>
                <div className="font-medium">{(backtestResults.winRate * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Max Drawdown</div>
                <div className="font-medium">{(backtestResults.maxDrawdown * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Sharpe Ratio</div>
                <div className="font-medium">{backtestResults.sharpeRatio.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Market Data</h3>
          <div className="flex space-x-4 mb-4">
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value as '1h' | '4h' | '1d')}
              className="px-3 py-1 border border-gray-300 rounded-md"
            >
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
            <select
              value={chartType}
              onChange={e => setChartType(e.target.value as 'candlestick' | 'line')}
              className="px-3 py-1 border border-gray-300 rounded-md"
            >
              <option value="candlestick">Candlestick</option>
              <option value="line">Line</option>
            </select>
          </div>
          <PriceChart data={marketData} pair={strategy.parameters.pair} />
        </div>

        {/* Performance Charts */}
        {backtestResults?.trades && backtestResults.trades.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Performance Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-md font-medium mb-2">Equity Curve</h4>
                <PerformanceChart
                  trades={backtestResults.trades}
                  chartType="equity"
                  timeframe="all"
                  height={200}
                  initialBalance={backtestResults.initialBalance}
                />
              </div>
              <div>
                <h4 className="text-md font-medium mb-2">Drawdown Analysis</h4>
                <PerformanceChart
                  trades={backtestResults.trades}
                  chartType="drawdown"
                  timeframe="all"
                  height={200}
                  initialBalance={backtestResults.initialBalance}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyDetails;
