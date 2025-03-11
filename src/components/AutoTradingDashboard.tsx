import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowDown,
  Play,
  Pause,
  Zap,
  Brain,
  Rocket,
  Settings,
  TrendingUp,
  BarChart2,
  Timer,
  Check,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  Clock,
  Target,
} from 'lucide-react';
import {
  backtestService,
  mlStrategyOptimizer,
  demoTradeService,
} from '../services/backtestService';
import { automatedTrading } from '../services/automatedTrading';
import { Strategy, StrategyType } from '../types/strategy';
import PriceChart from './charts/PriceChart';

const AUTO_DISCOVERY_DAYS = 90; // Days of historical data for strategy discovery
const MINIMUM_TRADES = 30; // Minimum trades for reliable strategy evaluation
const MINIMUM_PROFIT_PCT = 5; // Minimum profit percentage for accepting a strategy
const MIN_WIN_RATE = 0.55; // Minimum win rate

interface AutoTradingDashboardProps {
  onShowDetails?: (strategyId: string) => void;
}

const AutoTradingDashboard: React.FC<AutoTradingDashboardProps> = ({ onShowDetails }) => {
  // System modes
  const [systemMode, setSystemMode] = useState<'discovery' | 'validation' | 'live' | 'idle'>(
    'idle'
  );

  // Strategies
  const [discoveredStrategies, setDiscoveredStrategies] = useState<Strategy[]>([]);
  const [validatedStrategies, setValidatedStrategies] = useState<Strategy[]>([]);
  const [liveStrategies, setLiveStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  // Progress and status indicators
  const [discoveryProgress, setDiscoveryProgress] = useState<number>(0);
  const [validationProgress, setValidationProgress] = useState<number>(0);
  const [discoveryStatus, setDiscoveryStatus] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<string>('');

  // Performance tracking
  const [systemPerformance, setSystemPerformance] = useState<{
    totalProfit: number;
    winRate: number;
    trades: number;
    startBalance: number;
    currentBalance: number;
    runningDays: number;
    bestStrategy: string | null;
  }>({
    totalProfit: 0,
    winRate: 0,
    trades: 0,
    startBalance: 10000,
    currentBalance: 10000,
    runningDays: 0,
    bestStrategy: null,
  });

  // Market data for active symbols
  const [activeSymbols, setActiveSymbols] = useState<string[]>([
    'BTC-USDT',
    'ETH-USDT',
    'SOL-USDT',
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC-USDT');
  const [marketData, setMarketData] = useState<any[]>([]);

  // Auto-discovery settings
  const [discoverySettings, setDiscoverySettings] = useState({
    maxStrategies: 5,
    timeframes: ['1h', '4h', '1d'],
    strategyTypes: [
      StrategyType.MA_CROSSOVER,
      StrategyType.RSI,
      StrategyType.MACD,
      StrategyType.BOLLINGER_BANDS,
    ],
    symbols: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'],
    evaluationPeriodDays: 90,
    targetProfitPct: 15,
    maxDrawdownPct: 15,
    minTradesCount: 30,
  });

  // Validation settings
  const [validationSettings, setValidationSettings] = useState({
    demoTradeDurationDays: 7,
    minWinRate: 0.55,
    minProfitPct: 3,
    minTradesPerDay: 3,
  });

  // Live trading settings
  const [liveTradingSettings, setLiveTradingSettings] = useState({
    initialBalance: 10000,
    maxRiskPerTrade: 2, // percentage of balance
    maxConcurrentPositions: 3,
    maxDailyDrawdown: 5, // percentage
    enableTrailingStop: true,
    trailingStopPct: 1.5,
  });

  // UI controls
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'discovery' | 'validation' | 'live'>(
    'discovery'
  );
  const [isLoadingMarketData, setIsLoadingMarketData] = useState<boolean>(false);

  // Fetch market data on mount and when selected symbol changes
  useEffect(() => {
    fetchMarketData(selectedSymbol);
  }, [selectedSymbol]);

  // Update performance metrics periodically
  useEffect(() => {
    if (systemMode === 'live') {
      const interval = setInterval(updatePerformanceMetrics, 60000);
      return () => clearInterval(interval);
    }
  }, [systemMode]);

  // Fetch market data for the selected symbol
  const fetchMarketData = async (symbol: string) => {
    setIsLoadingMarketData(true);
    try {
      // Get historical data for the selected symbol
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const data = await backtestService.getHistoricalData(symbol, startDate, endDate);
      setMarketData(data);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setIsLoadingMarketData(false);
    }
  };

  // Start strategy discovery process
  const startStrategyDiscovery = async () => {
    setSystemMode('discovery');
    setDiscoveryProgress(0);
    setDiscoveredStrategies([]);

    try {
      // Set initial discovery status
      setDiscoveryStatus('Analyzing market conditions...');

      // Iterate through each symbol and timeframe combination
      const strategies: Strategy[] = [];
      const totalCombinations =
        discoverySettings.symbols.length *
        discoverySettings.timeframes.length *
        discoverySettings.strategyTypes.length;
      let completedCombinations = 0;

      for (const symbol of discoverySettings.symbols) {
        setDiscoveryStatus(`Fetching historical data for ${symbol}...`);

        // Get historical data for the current symbol
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(
          Date.now() - discoverySettings.evaluationPeriodDays * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split('T')[0];

        const marketData = await backtestService.getHistoricalData(symbol, startDate, endDate);

        for (const timeframe of discoverySettings.timeframes) {
          for (const strategyType of discoverySettings.strategyTypes) {
            setDiscoveryStatus(
              `Generating ${getStrategyTypeName(strategyType)} strategy for ${symbol} (${timeframe})...`
            );

            // Generate strategy with default parameters based on strategy type
            const strategy = generateStrategy(strategyType, symbol, timeframe);

            // Backtest the strategy to evaluate its performance
            setDiscoveryStatus(`Backtesting ${strategy.name}...`);
            const backtestResult = await backtestService.runBacktest(strategy, {
              startDate,
              endDate,
              initialBalance: 10000,
              feeRate: 0.001,
              slippage: 0.001,
              useHistoricalData: true,
            });

            // Analyze backtest results
            const isPromising =
              backtestResult.totalTrades >= MINIMUM_TRADES &&
              backtestResult.winRate >= MIN_WIN_RATE &&
              backtestResult.totalPnL > 0;

            if (isPromising) {
              // Optimize the strategy using ML
              setDiscoveryStatus(`Optimizing promising strategy: ${strategy.name}...`);
              const optimizedStrategy = await mlStrategyOptimizer.improveStrategy(
                strategy,
                backtestResult,
                marketData
              );

              // Re-test optimized strategy
              const optimizedResult = await backtestService.runBacktest(optimizedStrategy, {
                startDate,
                endDate,
                initialBalance: 10000,
                feeRate: 0.001,
                slippage: 0.001,
                useHistoricalData: true,
              });

              // Save performance metrics with the strategy
              optimizedStrategy.performance = {
                totalPnL: optimizedResult.totalPnL,
                winRate: optimizedResult.winRate,
                tradesCount: optimizedResult.totalTrades,
                maxDrawdown: optimizedResult.maxDrawdown,
                sharpeRatio: optimizedResult.sharpeRatio,
                profitFactor: optimizedResult.metrics.profitFactor,
              };

              // Add to discovered strategies
              strategies.push(optimizedStrategy);
            }

            // Update progress
            completedCombinations++;
            setDiscoveryProgress((completedCombinations / totalCombinations) * 100);
          }
        }
      }

      // Sort strategies by performance (total P&L)
      strategies.sort((a, b) => {
        if (!a.performance || !b.performance) return 0;
        return b.performance.totalPnL - a.performance.totalPnL;
      });

      // Limit to top strategies
      const topStrategies = strategies.slice(0, discoverySettings.maxStrategies);
      setDiscoveredStrategies(topStrategies);

      // Update status
      if (topStrategies.length > 0) {
        setDiscoveryStatus(
          `Discovery complete. Found ${topStrategies.length} promising strategies.`
        );
      } else {
        setDiscoveryStatus('No promising strategies found. Consider adjusting discovery settings.');
      }
    } catch (error) {
      console.error('Error during strategy discovery:', error);
      setDiscoveryStatus('Error during strategy discovery. Please try again.');
    }
  };

  // Start validation process (demo trading)
  const startValidation = async () => {
    if (discoveredStrategies.length === 0) {
      alert('No strategies to validate. Please run discovery first.');
      return;
    }

    setSystemMode('validation');
    setValidationProgress(0);
    setValidatedStrategies([]);

    try {
      // Set initial validation status
      setValidationStatus('Initializing demo trading environment...');

      // Start demo trading for each strategy sequentially
      for (let i = 0; i < discoveredStrategies.length; i++) {
        const strategy = discoveredStrategies[i];
        setValidationStatus(`Starting demo trading for ${strategy.name}...`);

        // Reset demo trading service
        demoTradeService.stop();

        // Start demo trading for this strategy
        demoTradeService.start(strategy);

        // Update progress - each strategy is worth 20% of progress, remaining 80% is for running time
        setValidationProgress((i / discoveredStrategies.length) * 20);

        // Wait for demo trading to accumulate enough data (simulate this with a setTimeout)
        setValidationStatus(`Running demo trading for ${strategy.name}...`);

        // Calculate how long we should wait for each strategy to accumulate sufficient data
        const daysPerStrategy =
          validationSettings.demoTradeDurationDays / discoveredStrategies.length;
        const msPerStrategy = daysPerStrategy * 24 * 60 * 60 * 1000;

        // For demo purposes, we'll use a very short timeout (5 seconds per strategy)
        // In a real implementation, this would be a longer period (several days)
        const demoTimeoutMs = 5000;

        await new Promise(resolve => {
          // Progress update interval
          const interval = setInterval(() => {
            const elapsedRatio = (Date.now() - startTime) / demoTimeoutMs;
            const progressForThisStrategy = Math.min(100, elapsedRatio * 100);

            // Base progress is the completed strategies (20% portion) plus a fraction of the current strategy's progress
            const baseProgress = (i / discoveredStrategies.length) * 20;
            const currentProgress =
              (progressForThisStrategy / 100) * (80 / discoveredStrategies.length);

            setValidationProgress(baseProgress + currentProgress);
          }, 200);

          const startTime = Date.now();

          // Resolve after timeout
          setTimeout(() => {
            clearInterval(interval);
            resolve(null);
          }, demoTimeoutMs);
        });

        // Get performance data
        const performance = demoTradeService.getPerformance();

        // Update strategy with demo performance
        if (
          performance &&
          performance.profitLoss > 0 &&
          performance.winRate >= validationSettings.minWinRate
        ) {
          const validated = {
            ...strategy,
            demoPerformance: {
              totalPnL: performance.profitLoss,
              winRate: performance.winRate,
              tradesCount: performance.totalTrades,
              readyForLive: performance.isLiveReady,
            },
          };

          setValidatedStrategies(prev => [...prev, validated]);
        }

        // Stop demo trading for this strategy
        demoTradeService.stop();
      }

      // Update status
      if (validatedStrategies.length > 0) {
        setValidationStatus(
          `Validation complete. ${validatedStrategies.length} strategies ready for live trading.`
        );
      } else {
        setValidationStatus(
          'No strategies passed validation. Consider adjusting discovery settings.'
        );
      }
    } catch (error) {
      console.error('Error during strategy validation:', error);
      setValidationStatus('Error during validation. Please try again.');
    }
  };

  // Start live trading
  const startLiveTrading = async () => {
    if (validatedStrategies.length === 0) {
      alert('No validated strategies to trade. Please run validation first.');
      return;
    }

    setSystemMode('live');
    setLiveStrategies([]);

    try {
      // Configure automated trading service
      automatedTrading.updateConfig({
        maxPositions: liveTradingSettings.maxConcurrentPositions,
        maxLeverage: 1, // No leverage by default
        riskPerTrade: liveTradingSettings.maxRiskPerTrade,
        stopLossPercent: 2,
        takeProfitPercent: 4,
        trailingStopPercent: liveTradingSettings.enableTrailingStop
          ? liveTradingSettings.trailingStopPct
          : undefined,
        maxDrawdown: liveTradingSettings.maxDailyDrawdown,
        maxDailyLoss: liveTradingSettings.maxDailyDrawdown,
        correlationThreshold: 0.7,
      });

      // Add validated strategies
      validatedStrategies.forEach(strategy => {
        automatedTrading.addStrategy(strategy);
        setLiveStrategies(prev => [...prev, strategy]);
      });

      // Start automated trading
      automatedTrading.start();

      // Initialize performance tracking
      setSystemPerformance({
        totalProfit: 0,
        winRate: 0,
        trades: 0,
        startBalance: liveTradingSettings.initialBalance,
        currentBalance: liveTradingSettings.initialBalance,
        runningDays: 0,
        bestStrategy: validatedStrategies[0]?.id || null,
      });
    } catch (error) {
      console.error('Error starting live trading:', error);
      alert('Error starting live trading. Please check the console for details.');
    }
  };

  // Stop the current system mode
  const stopCurrentMode = () => {
    switch (systemMode) {
      case 'discovery':
        // No specific cleanup needed for discovery
        setDiscoveryStatus('Discovery stopped.');
        break;
      case 'validation':
        demoTradeService.stop();
        setValidationStatus('Validation stopped.');
        break;
      case 'live':
        // Stop all live trading
        liveStrategies.forEach(strategy => {
          automatedTrading.removeStrategy(strategy.id);
        });
        automatedTrading.stop();
        break;
    }

    setSystemMode('idle');
  };

  // Update performance metrics (called periodically when live trading is active)
  const updatePerformanceMetrics = () => {
    if (systemMode !== 'live') return;

    // In a real implementation, this would get actual performance data from the trading service
    // For this demo, we'll simulate performance updates

    const daysSinceStart = Math.floor(
      (Date.now() - systemPerformance.startBalance) / (24 * 60 * 60 * 1000)
    );
    const trades = systemPerformance.trades + Math.floor(Math.random() * 5);
    const wins = Math.floor(trades * (0.5 + Math.random() * 0.15));
    const winRate = trades > 0 ? wins / trades : 0;

    // Simulate price changes and P&L calculation
    const dailyPnLPercent = Math.random() * 1.2 - 0.3; // Between -0.3% and 0.9% daily
    const newBalance = systemPerformance.currentBalance * (1 + dailyPnLPercent / 100);
    const totalProfit = newBalance - systemPerformance.startBalance;

    setSystemPerformance({
      ...systemPerformance,
      totalProfit,
      winRate,
      trades,
      currentBalance: newBalance,
      runningDays: daysSinceStart,
    });
  };

  // Generate a strategy with default parameters based on type
  const generateStrategy = (type: StrategyType, pair: string, timeframe: string): Strategy => {
    const id = `${type}_${pair}_${timeframe}_${Date.now()}`;

    let parameters: any = {
      pair,
      timeframe,
    };

    switch (type) {
      case StrategyType.MA_CROSSOVER:
        parameters = {
          ...parameters,
          shortPeriod: 10,
          longPeriod: 50,
        };
        break;
      case StrategyType.RSI:
        parameters = {
          ...parameters,
          period: 14,
          oversold: 30,
          overbought: 70,
        };
        break;
      case StrategyType.MACD:
        parameters = {
          ...parameters,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
        };
        break;
      case StrategyType.BOLLINGER_BANDS:
        parameters = {
          ...parameters,
          period: 20,
          standardDeviations: 2,
        };
        break;
    }

    return {
      id,
      name: `${getStrategyTypeName(type)} ${pair} ${timeframe}`,
      type,
      parameters,
      created: new Date().toISOString(),
    };
  };

  // Helper function to get friendly strategy type names
  const getStrategyTypeName = (type: StrategyType): string => {
    switch (type) {
      case StrategyType.MA_CROSSOVER:
        return 'MA Crossover';
      case StrategyType.RSI:
        return 'RSI';
      case StrategyType.BREAKOUT:
        return 'Breakout';
      case StrategyType.MACD:
        return 'MACD';
      case StrategyType.BOLLINGER_BANDS:
        return 'Bollinger Bands';
      case StrategyType.ICHIMOKU:
        return 'Ichimoku';
      case StrategyType.PATTERN_RECOGNITION:
        return 'Pattern Recognition';
      case StrategyType.MULTI_FACTOR:
        return 'Multi-Factor';
      default:
        return 'Custom';
    }
  };

  // Format currency for display
  const formatCurrency = (value: number, digits: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  };

  // Format percentage for display
  const formatPercent = (value: number, digits: number = 2) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
  };

  // Render active strategies list
  const renderActiveStrategies = (
    strategies: Strategy[],
    mode: 'discovered' | 'validated' | 'live'
  ) => {
    if (strategies.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <p>No active strategies</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {strategies.map(strategy => {
          const performance =
            mode === 'discovered'
              ? strategy.performance
              : mode === 'validated'
                ? strategy.demoPerformance
                : strategy.performance;

          return (
            <div
              key={strategy.id}
              className={`border rounded-md p-3 ${selectedStrategy?.id === strategy.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} hover:border-blue-300 transition-colors cursor-pointer`}
              onClick={() => setSelectedStrategy(strategy)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{strategy.name}</span>
                    {mode === 'validated' && strategy.demoPerformance?.readyForLive && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Ready for Live
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {strategy.parameters.pair} • {getStrategyTypeName(strategy.type)}
                  </div>
                </div>

                {performance && (
                  <div className="text-right">
                    <span
                      className={`font-medium ${performance.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(performance.totalPnL)}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      <span>{(performance.winRate * 100).toFixed(1)}% Win Rate</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* System Control Panel */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Automated Trading System</h2>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-sm flex items-center ${
                systemMode === 'idle'
                  ? 'bg-gray-100 text-gray-800'
                  : systemMode === 'discovery'
                    ? 'bg-blue-100 text-blue-800'
                    : systemMode === 'validation'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
              }`}
            >
              {systemMode === 'idle' && <Clock className="h-3 w-3 mr-1" />}
              {systemMode === 'discovery' && <Brain className="h-3 w-3 mr-1 animate-pulse" />}
              {systemMode === 'validation' && <Target className="h-3 w-3 mr-1 animate-pulse" />}
              {systemMode === 'live' && <Rocket className="h-3 w-3 mr-1" />}
              {systemMode === 'idle'
                ? 'Idle'
                : systemMode === 'discovery'
                  ? 'Discovering'
                  : systemMode === 'validation'
                    ? 'Validating'
                    : 'Live Trading'}
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <Settings className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Workflow Process Visualization */}
        <div className="mb-8">
          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-8 top-0 h-full w-1 bg-gray-200" />

            {/* Workflow Steps */}
            <div className="space-y-8">
              {/* Step 1: Strategy Discovery */}
              <div className="relative flex">
                <div
                  className={`z-10 flex items-center justify-center w-16 h-16 rounded-full border-2 ${
                    systemMode === 'discovery'
                      ? 'border-blue-500 bg-blue-100 text-blue-600 animate-pulse'
                      : discoveredStrategies.length > 0
                        ? 'border-green-500 bg-green-100 text-green-600'
                        : 'border-gray-300 bg-white text-gray-500'
                  }`}
                >
                  <Brain className="h-6 w-6" />
                </div>

                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium">Strategy Discovery</h3>
                  <p className="text-gray-500 mb-4">
                    Discover and optimize profitable trading strategies
                  </p>

                  {systemMode === 'discovery' && (
                    <>
                      <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${discoveryProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-blue-600 mb-4">{discoveryStatus}</p>
                    </>
                  )}

                  {systemMode === 'discovery' ? (
                    <button
                      onClick={stopCurrentMode}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Stop Discovery
                    </button>
                  ) : systemMode === 'idle' ? (
                    <button
                      onClick={startStrategyDiscovery}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Start Discovery
                    </button>
                  ) : (
                    <button
                      onClick={() => {}}
                      disabled
                      className="px-4 py-2 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
                    >
                      {discoveredStrategies.length > 0 ? 'Discovery Complete' : 'Run Discovery'}
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Validation/Demo Trading */}
              <div className="relative flex">
                <div
                  className={`z-10 flex items-center justify-center w-16 h-16 rounded-full border-2 ${
                    systemMode === 'validation'
                      ? 'border-purple-500 bg-purple-100 text-purple-600 animate-pulse'
                      : validatedStrategies.length > 0
                        ? 'border-green-500 bg-green-100 text-green-600'
                        : 'border-gray-300 bg-white text-gray-500'
                  }`}
                >
                  <Target className="h-6 w-6" />
                </div>

                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium">Validation</h3>
                  <p className="text-gray-500 mb-4">
                    Test strategies in demo mode with real market conditions
                  </p>

                  {systemMode === 'validation' && (
                    <>
                      <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${validationProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-purple-600 mb-4">{validationStatus}</p>
                    </>
                  )}

                  {systemMode === 'validation' ? (
                    <button
                      onClick={stopCurrentMode}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Stop Validation
                    </button>
                  ) : discoveredStrategies.length > 0 && systemMode === 'idle' ? (
                    <button
                      onClick={startValidation}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Start Validation
                    </button>
                  ) : (
                    <button
                      onClick={() => {}}
                      disabled
                      className="px-4 py-2 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
                    >
                      {validatedStrategies.length > 0 ? 'Validation Complete' : 'Run Validation'}
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3: Live Trading */}
              <div className="relative flex">
                <div
                  className={`z-10 flex items-center justify-center w-16 h-16 rounded-full border-2 ${
                    systemMode === 'live'
                      ? 'border-green-500 bg-green-100 text-green-600'
                      : 'border-gray-300 bg-white text-gray-500'
                  }`}
                >
                  <Rocket className="h-6 w-6" />
                </div>

                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium">Live Trading</h3>
                  <p className="text-gray-500 mb-4">Automate trading with validated strategies</p>

                  {systemMode === 'live' && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Active Strategies</div>
                          <div className="font-medium">{liveStrategies.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Current Balance</div>
                          <div className="font-medium">
                            {formatCurrency(systemPerformance.currentBalance)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total P&L</div>
                          <div
                            className={`font-medium ${systemPerformance.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {formatCurrency(systemPerformance.totalProfit)}
                            <span className="ml-1 text-xs">
                              (
                              {formatPercent(
                                (systemPerformance.totalProfit / systemPerformance.startBalance) *
                                  100
                              )}
                              )
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Win Rate</div>
                          <div className="font-medium">
                            {(systemPerformance.winRate * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total Trades</div>
                          <div className="font-medium">{systemPerformance.trades}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Running For</div>
                          <div className="font-medium">{systemPerformance.runningDays} days</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {systemMode === 'live' ? (
                    <button
                      onClick={stopCurrentMode}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Stop Trading
                    </button>
                  ) : validatedStrategies.length > 0 && systemMode === 'idle' ? (
                    <button
                      onClick={startLiveTrading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Start Live Trading
                    </button>
                  ) : (
                    <button
                      onClick={() => {}}
                      disabled
                      className="px-4 py-2 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
                    >
                      Go Live
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategies and Performance Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discovered Strategies */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-500" />
            Discovered Strategies
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {discoveredStrategies.length}
            </span>
          </h3>

          {renderActiveStrategies(discoveredStrategies, 'discovered')}
        </div>

        {/* Validated Strategies */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-500" />
            Validated Strategies
            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
              {validatedStrategies.length}
            </span>
          </h3>

          {renderActiveStrategies(validatedStrategies, 'validated')}
        </div>

        {/* Live Trading Strategies */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Rocket className="h-5 w-5 mr-2 text-green-500" />
            Live Trading Strategies
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              {liveStrategies.length}
            </span>
          </h3>

          {renderActiveStrategies(liveStrategies, 'live')}
        </div>
      </div>

      {/* Market Data and Strategy Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Data Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Market Data
            </h3>

            <select
              value={selectedSymbol}
              onChange={e => setSelectedSymbol(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md"
            >
              {activeSymbols.map(symbol => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>

          {isLoadingMarketData ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              <span className="ml-2 text-gray-500">Loading market data...</span>
            </div>
          ) : marketData.length > 0 ? (
            <PriceChart data={marketData} pair={selectedSymbol} />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <span className="ml-2 text-gray-500">No market data available</span>
            </div>
          )}
        </div>

        {/* Selected Strategy Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium flex items-center mb-4">
            <Zap className="h-5 w-5 mr-2 text-blue-500" />
            Strategy Details
          </h3>

          {selectedStrategy ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-lg">{selectedStrategy.name}</h4>
                  <p className="text-sm text-gray-500">
                    {selectedStrategy.parameters.pair} •{' '}
                    {getStrategyTypeName(selectedStrategy.type)}
                  </p>
                </div>

                <button
                  onClick={() => onShowDetails && onShowDetails(selectedStrategy.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  Full Details
                  <ArrowRight className="ml-1 h-4 w-4" />
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2">Parameters</h5>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {Object.entries(selectedStrategy.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-gray-500">{key}:</span>
                      <span className="text-sm font-medium">{value?.toString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {(selectedStrategy.performance || selectedStrategy.demoPerformance) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Performance</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total P&L</div>
                      <div
                        className={`font-medium ${
                          (selectedStrategy.performance?.totalPnL ||
                            selectedStrategy.demoPerformance?.totalPnL ||
                            0) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(
                          selectedStrategy.performance?.totalPnL ||
                            selectedStrategy.demoPerformance?.totalPnL ||
                            0
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Win Rate</div>
                      <div className="font-medium">
                        {(
                          (selectedStrategy.performance?.winRate ||
                            selectedStrategy.demoPerformance?.winRate ||
                            0) * 100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Trades</div>
                      <div className="font-medium">
                        {selectedStrategy.performance?.tradesCount ||
                          selectedStrategy.demoPerformance?.tradesCount ||
                          0}
                      </div>
                    </div>
                  </div>

                  {selectedStrategy.performance?.sharpeRatio && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Sharpe Ratio</div>
                        <div className="font-medium">
                          {selectedStrategy.performance.sharpeRatio.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Max Drawdown</div>
                        <div className="font-medium">
                          {(selectedStrategy.performance.maxDrawdown * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Profit Factor</div>
                        <div className="font-medium">
                          {selectedStrategy.performance.profitFactor?.toFixed(2) || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStrategy.demoPerformance?.readyForLive === true && (
                    <div className="mt-3 text-green-700 flex items-center text-sm">
                      <Check className="h-4 w-4 mr-1" />
                      Ready for live trading
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                {systemMode === 'idle' && !validatedStrategies.includes(selectedStrategy) && (
                  <button
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-sm"
                    onClick={() => startValidation()} // This would validate just this strategy
                  >
                    <Target className="h-4 w-4 mr-1 inline" />
                    Run Validation
                  </button>
                )}

                {systemMode === 'idle' && validatedStrategies.includes(selectedStrategy) && (
                  <button
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                    onClick={() => startLiveTrading()} // This would trade just this strategy
                  >
                    <Rocket className="h-4 w-4 mr-1 inline" />
                    Trade Live
                  </button>
                )}

                {systemMode === 'live' && liveStrategies.includes(selectedStrategy) && (
                  <button
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                    onClick={() => {
                      automatedTrading.removeStrategy(selectedStrategy.id);
                      setLiveStrategies(prev => prev.filter(s => s.id !== selectedStrategy.id));
                    }}
                  >
                    <Pause className="h-4 w-4 mr-1 inline" />
                    Stop Trading
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <HelpCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-2">No Strategy Selected</h3>
              <p>Select a strategy from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panels (modal-like) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">System Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              <div className="border-b border-gray-200 mb-4">
                <div className="flex">
                  <button
                    onClick={() => setActiveSettingsTab('discovery')}
                    className={`py-2 px-4 font-medium border-b-2 ${
                      activeSettingsTab === 'discovery'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500'
                    }`}
                  >
                    Discovery
                  </button>
                  <button
                    onClick={() => setActiveSettingsTab('validation')}
                    className={`py-2 px-4 font-medium border-b-2 ${
                      activeSettingsTab === 'validation'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500'
                    }`}
                  >
                    Validation
                  </button>
                  <button
                    onClick={() => setActiveSettingsTab('live')}
                    className={`py-2 px-4 font-medium border-b-2 ${
                      activeSettingsTab === 'live'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500'
                    }`}
                  >
                    Live Trading
                  </button>
                </div>
              </div>

              {/* Discovery Settings */}
              {activeSettingsTab === 'discovery' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Strategy Discovery Settings</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Strategies to Discover
                      </label>
                      <input
                        type="number"
                        value={discoverySettings.maxStrategies}
                        onChange={e =>
                          setDiscoverySettings({
                            ...discoverySettings,
                            maxStrategies: parseInt(e.target.value) || 5,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Evaluation Period (Days)
                      </label>
                      <input
                        type="number"
                        value={discoverySettings.evaluationPeriodDays}
                        onChange={e =>
                          setDiscoverySettings({
                            ...discoverySettings,
                            evaluationPeriodDays: parseInt(e.target.value) || 90,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Profit (%)
                      </label>
                      <input
                        type="number"
                        value={discoverySettings.targetProfitPct}
                        onChange={e =>
                          setDiscoverySettings({
                            ...discoverySettings,
                            targetProfitPct: parseInt(e.target.value) || 15,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Drawdown (%)
                      </label>
                      <input
                        type="number"
                        value={discoverySettings.maxDrawdownPct}
                        onChange={e =>
                          setDiscoverySettings({
                            ...discoverySettings,
                            maxDrawdownPct: parseInt(e.target.value) || 15,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Trades Count
                      </label>
                      <input
                        type="number"
                        value={discoverySettings.minTradesCount}
                        onChange={e =>
                          setDiscoverySettings({
                            ...discoverySettings,
                            minTradesCount: parseInt(e.target.value) || 30,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Symbols to Analyze
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'ADA-USDT', 'DOT-USDT'].map(symbol => (
                        <label key={symbol} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={discoverySettings.symbols.includes(symbol)}
                            onChange={e => {
                              if (e.target.checked) {
                                setDiscoverySettings({
                                  ...discoverySettings,
                                  symbols: [...discoverySettings.symbols, symbol],
                                });
                              } else {
                                setDiscoverySettings({
                                  ...discoverySettings,
                                  symbols: discoverySettings.symbols.filter(s => s !== symbol),
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{symbol}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeframes to Analyze
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['5m', '15m', '1h', '4h', '1d'].map(timeframe => (
                        <label key={timeframe} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={discoverySettings.timeframes.includes(timeframe)}
                            onChange={e => {
                              if (e.target.checked) {
                                setDiscoverySettings({
                                  ...discoverySettings,
                                  timeframes: [...discoverySettings.timeframes, timeframe],
                                });
                              } else {
                                setDiscoverySettings({
                                  ...discoverySettings,
                                  timeframes: discoverySettings.timeframes.filter(
                                    t => t !== timeframe
                                  ),
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{timeframe}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strategy Types to Analyze
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(StrategyType).map(type => (
                        <label key={type} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={discoverySettings.strategyTypes.includes(type)}
                            onChange={e => {
                              if (e.target.checked) {
                                setDiscoverySettings({
                                  ...discoverySettings,
                                  strategyTypes: [...discoverySettings.strategyTypes, type],
                                });
                              } else {
                                setDiscoverySettings({
                                  ...discoverySettings,
                                  strategyTypes: discoverySettings.strategyTypes.filter(
                                    t => t !== type
                                  ),
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {getStrategyTypeName(type)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Settings */}
              {activeSettingsTab === 'validation' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Validation Settings</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Demo Trade Duration (Days)
                      </label>
                      <input
                        type="number"
                        value={validationSettings.demoTradeDurationDays}
                        onChange={e =>
                          setValidationSettings({
                            ...validationSettings,
                            demoTradeDurationDays: parseInt(e.target.value) || 7,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Win Rate
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={validationSettings.minWinRate}
                        onChange={e =>
                          setValidationSettings({
                            ...validationSettings,
                            minWinRate: parseFloat(e.target.value) || 0.55,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Profit (%)
                      </label>
                      <input
                        type="number"
                        value={validationSettings.minProfitPct}
                        onChange={e =>
                          setValidationSettings({
                            ...validationSettings,
                            minProfitPct: parseFloat(e.target.value) || 3,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Trades Per Day
                      </label>
                      <input
                        type="number"
                        value={validationSettings.minTradesPerDay}
                        onChange={e =>
                          setValidationSettings({
                            ...validationSettings,
                            minTradesPerDay: parseInt(e.target.value) || 3,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Trading Settings */}
              {activeSettingsTab === 'live' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Live Trading Settings</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Balance
                      </label>
                      <input
                        type="number"
                        value={liveTradingSettings.initialBalance}
                        onChange={e =>
                          setLiveTradingSettings({
                            ...liveTradingSettings,
                            initialBalance: parseInt(e.target.value) || 10000,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Risk Per Trade (%)
                      </label>
                      <input
                        type="number"
                        value={liveTradingSettings.maxRiskPerTrade}
                        onChange={e =>
                          setLiveTradingSettings({
                            ...liveTradingSettings,
                            maxRiskPerTrade: parseFloat(e.target.value) || 2,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Concurrent Positions
                      </label>
                      <input
                        type="number"
                        value={liveTradingSettings.maxConcurrentPositions}
                        onChange={e =>
                          setLiveTradingSettings({
                            ...liveTradingSettings,
                            maxConcurrentPositions: parseInt(e.target.value) || 3,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Daily Drawdown (%)
                      </label>
                      <input
                        type="number"
                        value={liveTradingSettings.maxDailyDrawdown}
                        onChange={e =>
                          setLiveTradingSettings({
                            ...liveTradingSettings,
                            maxDailyDrawdown: parseFloat(e.target.value) || 5,
                          })
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center">
                        <input
                          id="enable-trailing-stop"
                          type="checkbox"
                          checked={liveTradingSettings.enableTrailingStop}
                          onChange={e =>
                            setLiveTradingSettings({
                              ...liveTradingSettings,
                              enableTrailingStop: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor="enable-trailing-stop"
                          className="ml-2 block text-sm text-gray-700"
                        >
                          Enable Trailing Stop
                        </label>
                      </div>
                    </div>

                    {liveTradingSettings.enableTrailingStop && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Trailing Stop (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={liveTradingSettings.trailingStopPct}
                          onChange={e =>
                            setLiveTradingSettings({
                              ...liveTradingSettings,
                              trailingStopPct: parseFloat(e.target.value) || 1.5,
                            })
                          }
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-amber-400 mr-2" />
                      <p className="text-sm text-amber-700">
                        Live trading involves real money and carries significant risk. Make sure
                        you've thoroughly tested all strategies in demo mode before enabling live
                        trading.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mr-3"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoTradingDashboard;
