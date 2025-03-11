import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Strategy } from '../../types/strategy';
import {
  Zap,
  BarChart2,
  TrendingUp,
  ChartBar,
  ArrowRight,
  Sparkles,
  Target,
  Rocket,
  Check,
  Clock,
} from 'lucide-react';
import { backtestService, demoTradeService } from '../../services/backtestService';

interface StrategiesOverviewProps {
  strategies: Strategy[];
}

const StrategiesOverview: React.FC<StrategiesOverviewProps> = ({ strategies }) => {
  const [backtestingStrategy, setBacktestingStrategy] = useState<string | null>(null);
  const [demoTradingStrategy, setDemoTradingStrategy] = useState<string | null>(null);
  const [liveTradingStrategy, setLiveTradingStrategy] = useState<string | null>(null);

  // Get strategies status information
  const getStrategyStatus = (strategyId: string) => {
    if (demoTradingStrategy === strategyId) {
      const performance = demoTradeService.getPerformance();
      if (performance && performance.isLiveReady) {
        return {
          status: 'ready',
          icon: <Check className="h-3 w-3 text-green-500" />,
          text: 'Ready for Live',
          class: 'bg-green-100 text-green-800',
        };
      } else {
        return {
          status: 'demo',
          icon: <Target className="h-3 w-3 text-blue-500" />,
          text: 'In Demo',
          class: 'bg-blue-100 text-blue-800',
        };
      }
    }

    if (liveTradingStrategy === strategyId) {
      return {
        status: 'live',
        icon: <Rocket className="h-3 w-3 text-purple-500" />,
        text: 'Live Trading',
        class: 'bg-purple-100 text-purple-800',
      };
    }

    if (backtestingStrategy === strategyId) {
      return {
        status: 'backtesting',
        icon: <Clock className="h-3 w-3 text-amber-500 animate-spin" />,
        text: 'Backtesting',
        class: 'bg-amber-100 text-amber-800',
      };
    }

    // Check if the strategy has been backtested (has performance data)
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy?.performance) {
      if (strategy.performance.winRate > 0.6 && strategy.performance.totalPnL > 0) {
        return {
          status: 'validated',
          icon: <Sparkles className="h-3 w-3 text-indigo-500" />,
          text: 'Validated',
          class: 'bg-indigo-100 text-indigo-800',
        };
      } else {
        return {
          status: 'tested',
          icon: <BarChart2 className="h-3 w-3 text-blue-500" />,
          text: 'Backtested',
          class: 'bg-blue-100 text-blue-800',
        };
      }
    }

    return {
      status: 'new',
      icon: <Zap className="h-3 w-3 text-gray-500" />,
      text: 'New',
      class: 'bg-gray-100 text-gray-800',
    };
  };

  // Quick start backtest
  const startBacktest = async (strategy: Strategy) => {
    setBacktestingStrategy(strategy.id);
    try {
      const result = await backtestService.runBacktest(strategy, {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        initialBalance: 10000,
        feeRate: 0.001,
        slippage: 0.001,
        useHistoricalData: true,
      });

      // Update local strategy performance
      strategy.performance = {
        totalPnL: result.totalPnL,
        winRate: result.winRate,
        tradesCount: result.totalTrades,
      };
    } catch (error) {
      console.error('Error backtesting strategy:', error);
    } finally {
      setBacktestingStrategy(null);
    }
  };

  // Quick start demo trading
  const startDemoTrading = (strategy: Strategy) => {
    setDemoTradingStrategy(strategy.id);
    demoTradeService.start(strategy);
  };

  // Stop demo trading
  const stopDemoTrading = () => {
    demoTradeService.stop();
    setDemoTradingStrategy(null);
  };

  // Sort strategies by performance if available
  const sortedStrategies = [...strategies].sort((a, b) => {
    // Strategies with performance come first
    if (a.performance && !b.performance) return -1;
    if (!a.performance && b.performance) return 1;

    // Sort by profitability for strategies with performance
    if (a.performance && b.performance) {
      return b.performance.totalPnL - a.performance.totalPnL;
    }

    // Sort by name for strategies without performance
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Your Strategies</h2>
        <Link
          to="/strategies"
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
        >
          View All
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
          <Zap className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p className="mb-3">You don't have any strategies yet</p>
          <Link
            to="/strategies"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create your first strategy
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedStrategies.slice(0, 5).map(strategy => {
            const statusInfo = getStrategyStatus(strategy.id);

            return (
              <div
                key={strategy.id}
                className="border border-gray-200 rounded-md p-3 hover:border-blue-300 transition-colors duration-200"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center">
                      <span
                        className={`px-2 py-0.5 ${statusInfo.class} text-xs rounded-full flex items-center mr-2`}
                      >
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.text}</span>
                      </span>
                      <h3 className="font-medium">{strategy.name}</h3>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <span className="font-medium">{strategy.type}</span>
                      <span className="mx-1">•</span>
                      <span>{strategy.parameters.pair}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    {strategy.performance ? (
                      <div className="text-right">
                        <span
                          className={`font-medium ${
                            strategy.performance.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {strategy.performance.totalPnL.toFixed(2)} USD
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          <span>{(strategy.performance.winRate * 100).toFixed(1)}% Win Rate</span>
                          <span className="mx-1">•</span>
                          <span>{strategy.performance.tradesCount} Trades</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                          onClick={() => startBacktest(strategy)}
                          disabled={backtestingStrategy === strategy.id}
                        >
                          {backtestingStrategy === strategy.id ? (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                              Testing...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <BarChart2 className="h-3 w-3 mr-1" />
                              Backtest
                            </span>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Quick action buttons */}
                    {strategy.performance && (
                      <div className="flex mt-2 space-x-2">
                        {demoTradingStrategy === strategy.id ? (
                          <button
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                            onClick={stopDemoTrading}
                          >
                            Stop Demo
                          </button>
                        ) : !demoTradingStrategy ? (
                          <button
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded hover:bg-indigo-200"
                            onClick={() => startDemoTrading(strategy)}
                          >
                            <span className="flex items-center">
                              <Target className="h-3 w-3 mr-1" />
                              Demo Trade
                            </span>
                          </button>
                        ) : null}

                        {statusInfo.status === 'ready' && !liveTradingStrategy && (
                          <button
                            className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                            onClick={() => setLiveTradingStrategy(strategy.id)}
                          >
                            <span className="flex items-center">
                              <Rocket className="h-3 w-3 mr-1" />
                              Go Live
                            </span>
                          </button>
                        )}

                        {liveTradingStrategy === strategy.id && (
                          <button
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                            onClick={() => setLiveTradingStrategy(null)}
                          >
                            Stop Live
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {strategies.length > 5 && (
            <div className="text-center mt-3">
              <Link to="/strategies" className="text-blue-600 hover:text-blue-800 text-sm">
                View {strategies.length - 5} more strategies
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StrategiesOverview;
