import React from 'react';
import { TrendingUp, TrendingDown, BarChart2, PieChart, Activity, DollarSign } from 'lucide-react';
import { type Strategy } from '../../types/strategy';

interface StrategyMetricsProps {
  strategies: Strategy[];
  className?: string;
}

/**
 * Component to display detailed strategy metrics and statistics
 */
const StrategyMetrics: React.FC<StrategyMetricsProps> = ({ strategies, className = '' }) => {
  // Calculate aggregated metrics across all strategies
  const calculateAggregateMetrics = () => {
    const activeStrategies = strategies.filter(s => s.performance);

    if (activeStrategies.length === 0) {
      return {
        totalPnL: 0,
        averageWinRate: 0,
        totalTrades: 0,
        bestStrategy: null,
        worstStrategy: null,
      };
    }

    const totalPnL = activeStrategies.reduce((sum, s) => sum + (s.performance?.totalPnL || 0), 0);

    const totalTrades = activeStrategies.reduce(
      (sum, s) => sum + (s.performance?.tradesCount || 0),
      0
    );

    const averageWinRate =
      activeStrategies.reduce((sum, s) => sum + (s.performance?.winRate || 0), 0) /
      activeStrategies.length;

    // Find best and worst performing strategies
    const bestStrategy = [...activeStrategies].sort(
      (a, b) => (b.performance?.totalPnL || 0) - (a.performance?.totalPnL || 0)
    )[0];

    const worstStrategy = [...activeStrategies].sort(
      (a, b) => (a.performance?.totalPnL || 0) - (b.performance?.totalPnL || 0)
    )[0];

    return {
      totalPnL,
      averageWinRate,
      totalTrades,
      bestStrategy,
      worstStrategy,
    };
  };

  const metrics = calculateAggregateMetrics();

  // Categorize strategies by type
  const strategyTypeDistribution = strategies.reduce(
    (acc, strategy) => {
      acc[strategy.type] = (acc[strategy.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Strategy Performance Metrics</h3>
        <p className="text-sm text-gray-500">Aggregated analytics across all strategies</p>
      </div>

      <div className="p-5">
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total P&L */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total P&L</p>
                <p
                  className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${metrics.totalPnL >= 0 ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <DollarSign
                  className={`h-6 w-6 ${metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                />
              </div>
            </div>
          </div>

          {/* Average Win Rate */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Avg. Win Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(metrics.averageWinRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <PieChart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Trades */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Trades</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.totalTrades}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-200">
                <Activity className="h-6 w-6 text-gray-800" />
              </div>
            </div>
          </div>
        </div>

        {/* Best & Worst Strategies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Best Strategy */}
          {metrics.bestStrategy && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-full bg-green-100 mr-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Best Performing Strategy</h4>
                  <p className="text-sm text-gray-500">{metrics.bestStrategy.type}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Strategy</span>
                  <span className="font-medium">{metrics.bestStrategy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">P&L</span>
                  <span className="font-medium text-green-600">
                    +${metrics.bestStrategy.performance?.totalPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Win Rate</span>
                  <span className="font-medium">
                    {((metrics.bestStrategy.performance?.winRate || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Worst Strategy */}
          {metrics.worstStrategy && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-full bg-red-100 mr-3">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Worst Performing Strategy</h4>
                  <p className="text-sm text-gray-500">{metrics.worstStrategy.type}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Strategy</span>
                  <span className="font-medium">{metrics.worstStrategy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">P&L</span>
                  <span className="font-medium text-red-600">
                    ${metrics.worstStrategy.performance?.totalPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Win Rate</span>
                  <span className="font-medium">
                    {((metrics.worstStrategy.performance?.winRate || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Strategy Distribution */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-full bg-blue-100 mr-3">
              <BarChart2 className="h-5 w-5 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-800">Strategy Type Distribution</h4>
          </div>

          <div className="space-y-3">
            {Object.entries(strategyTypeDistribution).map(([type, count]) => (
              <div key={type} className="flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{type}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${(count / strategies.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyMetrics;
