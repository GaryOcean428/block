import React, { useState, useEffect } from 'react';
import { Strategy } from '../../types/strategy';
import { BacktestResult } from '../../types/backtest';
import {
  PlayCircle,
  Pause,
  BarChart,
  TrendingUp,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  Rocket,
  Zap,
  Clock,
  Target,
  Repeat,
  Hourglass,
} from 'lucide-react';

import {
  backtestService,
  mlStrategyOptimizer,
  demoTradeService,
} from '../../services/backtestService';
import { automatedTrading } from '../../services/automatedTrading';

interface StrategyWorkflowProps {
  strategy: Strategy;
}

const StrategyWorkflow: React.FC<StrategyWorkflowProps> = ({ strategy }) => {
  // State for workflow steps
  const [activeStep, setActiveStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // State for different operations
  const [isBacktesting, setIsBacktesting] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isDemoTrading, setIsDemoTrading] = useState<boolean>(false);
  const [isLiveTrading, setIsLiveTrading] = useState<boolean>(false);

  // Results
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [optimizedStrategy, setOptimizedStrategy] = useState<Strategy | null>(null);
  const [demoPerformance, setDemoPerformance] = useState<any | null>(null);
  const [livePerformance, setLivePerformance] = useState<any | null>(null);

  // Progress
  const [backtestProgress, setBacktestProgress] = useState<number>(0);
  const [optimizeProgress, setOptimizeProgress] = useState<number>(0);
  const [demoTimeRemaining, setDemoTimeRemaining] = useState<number | null>(null);

  // Backtest date range
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Update demo time remaining
  useEffect(() => {
    if (isDemoTrading) {
      const interval = setInterval(() => {
        if (demoPerformance) {
          const elapsed = Date.now() - demoPerformance.startTime;
          const target = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
          const remaining = Math.max(0, target - elapsed);
          setDemoTimeRemaining(remaining);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isDemoTrading, demoPerformance]);

  // Run backtest
  const runBacktest = async () => {
    try {
      setIsBacktesting(true);
      setBacktestProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setBacktestProgress(prev => {
          const newProgress = prev + Math.random() * 5;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 500);

      // Run the actual backtest
      const result = await backtestService.runBacktest(strategy, {
        startDate,
        endDate,
        initialBalance: 10000,
        feeRate: 0.001,
        slippage: 0.001,
        useHistoricalData: true,
      });

      clearInterval(progressInterval);
      setBacktestProgress(100);
      setBacktestResult(result);

      // Mark step as completed
      setCompletedSteps(prev => ({ ...prev, 0: true }));

      // Only advance to next step if we're currently on this step
      if (activeStep === 0) {
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Backtest error:', error);
    } finally {
      setIsBacktesting(false);
    }
  };

  // Optimize strategy
  const optimizeStrategy = async () => {
    if (!backtestResult) {
      return;
    }

    try {
      setIsOptimizing(true);
      setOptimizeProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setOptimizeProgress(prev => {
          const newProgress = prev + Math.random() * 5;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 500);

      // Fetch market data for ML optimization
      const marketData = await backtestService.getHistoricalData(
        strategy.parameters.pair,
        startDate,
        endDate
      );

      // Run ML optimization
      const improved = await mlStrategyOptimizer.improveStrategy(
        strategy,
        backtestResult,
        marketData
      );

      clearInterval(progressInterval);
      setOptimizeProgress(100);
      setOptimizedStrategy(improved);

      // Mark step as completed
      setCompletedSteps(prev => ({ ...prev, 1: true }));

      // Only advance to next step if we're currently on this step
      if (activeStep === 1) {
        setActiveStep(2);
      }
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Start demo trading
  const startDemoTrading = () => {
    try {
      const strategyToUse = optimizedStrategy || strategy;
      demoTradeService.start(strategyToUse);
      setIsDemoTrading(true);

      // Set initial demo performance
      updateDemoPerformance();

      // Schedule regular updates
      const interval = setInterval(updateDemoPerformance, 30000);
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Demo trading error:', error);
    }
  };

  // Stop demo trading
  const stopDemoTrading = () => {
    try {
      demoTradeService.stop();
      setIsDemoTrading(false);
      updateDemoPerformance();

      // Mark step as completed if demo performance looks good
      if (demoPerformance && demoPerformance.isLiveReady) {
        setCompletedSteps(prev => ({ ...prev, 2: true }));
        // Only advance to next step if we're currently on this step
        if (activeStep === 2) {
          setActiveStep(3);
        }
      }
    } catch (error) {
      console.error('Error stopping demo trading:', error);
    }
  };

  // Update demo performance
  const updateDemoPerformance = () => {
    const performance = demoTradeService.getPerformance();
    setDemoPerformance(performance);

    // Mark step as completed if it's been running for the required time and is profitable
    if (performance.isLiveReady) {
      setCompletedSteps(prev => ({ ...prev, 2: true }));
    }
  };

  // Start live trading
  const startLiveTrading = () => {
    try {
      const strategyToUse = optimizedStrategy || strategy;
      automatedTrading.addStrategy(strategyToUse);
      automatedTrading.start();
      setIsLiveTrading(true);

      // Mark step as completed
      setCompletedSteps(prev => ({ ...prev, 3: true }));
    } catch (error) {
      console.error('Live trading error:', error);
    }
  };

  // Stop live trading
  const stopLiveTrading = () => {
    try {
      automatedTrading.removeStrategy(strategy.id);
      if (optimizedStrategy) {
        automatedTrading.removeStrategy(optimizedStrategy.id);
      }
      setIsLiveTrading(false);
    } catch (error) {
      console.error('Error stopping live trading:', error);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${days}d ${hours}h ${minutes}m`;
  };

  // The workflow steps
  const steps = [
    {
      id: 0,
      name: 'Backtest',
      description: 'Validate strategy with historical data',
      icon: <BarChart className="h-5 w-5" />,
      action: runBacktest,
      isActive: isBacktesting,
      result: backtestResult,
      progress: backtestProgress,
      button: {
        text: isBacktesting ? 'Running...' : 'Run Backtest',
        disabled: isBacktesting,
      },
    },
    {
      id: 1,
      name: 'Optimize',
      description: 'Improve strategy with ML',
      icon: <Sparkles className="h-5 w-5" />,
      action: optimizeStrategy,
      isActive: isOptimizing,
      result: optimizedStrategy,
      progress: optimizeProgress,
      button: {
        text: isOptimizing ? 'Optimizing...' : 'Optimize Strategy',
        disabled: isOptimizing || !backtestResult,
      },
    },
    {
      id: 2,
      name: 'Demo Trade',
      description: 'Test in real market conditions',
      icon: <Target className="h-5 w-5" />,
      action: isDemoTrading ? stopDemoTrading : startDemoTrading,
      isActive: isDemoTrading,
      result: demoPerformance,
      button: {
        text: isDemoTrading ? 'Stop Demo' : 'Start Demo',
        disabled: false,
      },
    },
    {
      id: 3,
      name: 'Go Live',
      description: 'Start automated trading',
      icon: <Rocket className="h-5 w-5" />,
      action: isLiveTrading ? stopLiveTrading : startLiveTrading,
      isActive: isLiveTrading,
      result: livePerformance,
      button: {
        text: isLiveTrading ? 'Stop Trading' : 'Start Live Trading',
        disabled:
          (!demoPerformance?.isLiveReady && !isLiveTrading) ||
          (!completedSteps[2] && !isLiveTrading),
      },
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold mb-6">Strategy Workflow</h2>

      {/* Workflow Steps */}
      <div className="mb-8">
        <div className="relative">
          {/* Step connecting line */}
          <div className="absolute left-7 top-0 h-full w-0.5 bg-gray-200" />

          {/* Steps */}
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`relative flex ${activeStep === step.id ? 'opacity-100' : 'opacity-70'}`}
              >
                {/* Step circle */}
                <div
                  className={`z-10 flex items-center justify-center w-14 h-14 rounded-full border-2 ${
                    completedSteps[step.id]
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : step.isActive
                        ? 'bg-blue-100 border-blue-500 text-blue-600 animate-pulse'
                        : 'bg-white border-gray-300 text-gray-500'
                  }`}
                >
                  {completedSteps[step.id] ? <Check className="h-6 w-6" /> : step.icon}
                </div>

                {/* Step content */}
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium">{step.name}</h3>
                  <p className="text-gray-500 mb-3">{step.description}</p>

                  {/* Progress bar (for backtest and optimize) */}
                  {(step.id === 0 || step.id === 1) && step.isActive && (
                    <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Demo trading time remaining */}
                  {step.id === 2 && step.isActive && demoTimeRemaining !== null && (
                    <div className="flex items-center text-sm text-blue-600 mb-4">
                      <Hourglass className="h-4 w-4 mr-1" />
                      <span>
                        {demoTimeRemaining > 0
                          ? `${formatTimeRemaining(demoTimeRemaining)} until ready for live trading`
                          : 'Ready for evaluation'}
                      </span>
                    </div>
                  )}

                  {/* Result summary for each step */}
                  {step.result && (
                    <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
                      {step.id === 0 && backtestResult && (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-500">P&L:</span>{' '}
                            <span
                              className={
                                backtestResult.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                              }
                            >
                              ${backtestResult.totalPnL.toFixed(2)} (
                              {(
                                (backtestResult.totalPnL / backtestResult.initialBalance) *
                                100
                              ).toFixed(2)}
                              %)
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Win Rate:</span>{' '}
                            <span>{(backtestResult.winRate * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Trades:</span>{' '}
                            <span>{backtestResult.totalTrades}</span>
                          </div>
                        </div>
                      )}

                      {step.id === 1 && optimizedStrategy && (
                        <div>
                          <div className="text-green-600 font-medium mb-1">Strategy Improved</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {Object.entries(optimizedStrategy.parameters).map(([key, value], i) => {
                              // Only show parameters that differ from original
                              if (strategy.parameters[key] !== value) {
                                return (
                                  <div key={i} className="flex justify-between">
                                    <span className="text-gray-500">{key}:</span>
                                    <span>
                                      {value}{' '}
                                      <span className="text-xs text-gray-400">
                                        (was {strategy.parameters[key]})
                                      </span>
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}

                      {step.id === 2 && demoPerformance && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-gray-500">P&L:</span>{' '}
                              <span
                                className={
                                  demoPerformance.profitLoss >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }
                              >
                                ${demoPerformance.profitLoss.toFixed(2)} (
                                {demoPerformance.profitLossPercent.toFixed(2)}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Win Rate:</span>{' '}
                              <span>{(demoPerformance.winRate * 100).toFixed(1)}%</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-gray-500">Trades:</span>{' '}
                              <span>{demoPerformance.totalTrades}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-gray-500 mr-1">Status:</span>{' '}
                              {demoPerformance.isLiveReady ? (
                                <span className="flex items-center text-green-600">
                                  <Check className="h-3 w-3 mr-1" /> Ready for Live
                                </span>
                              ) : (
                                <span className="flex items-center text-amber-600">
                                  <Clock className="h-3 w-3 mr-1" /> Needs more time
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {step.id === 3 && isLiveTrading && (
                        <div className="flex items-center text-green-600">
                          <Zap className="h-4 w-4 mr-1" />
                          <span>Live trading active</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  <button
                    onClick={step.action}
                    disabled={step.button.disabled}
                    className={`px-4 py-2 rounded-md ${
                      step.isActive && step.id !== 3
                        ? 'bg-red-100 hover:bg-red-200 text-red-700'
                        : step.button.disabled
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : step.id === 3 && !step.isActive
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    }`}
                  >
                    {step.button.text}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Selection (for backtest) */}
      {activeStep === 0 && !isBacktesting && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-3">Backtest Period</h3>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Trading Notice */}
      {activeStep === 3 && !isLiveTrading && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">Important Notice</h3>
            <p className="text-sm text-amber-700">
              Live trading involves real money and carries risk. Make sure you've:
            </p>
            <ul className="text-sm text-amber-700 list-disc list-inside mt-2">
              <li>Thoroughly tested your strategy in demo mode</li>
              <li>Only allocated funds you can afford to lose</li>
              <li>Set appropriate risk parameters</li>
              <li>Understood the fees and potential slippage</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyWorkflow;
