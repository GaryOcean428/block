import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { TradingContextType } from '../types';
// Import types
import type { Trade, MarketData } from '../types';
import { StrategyType, type Strategy } from '../types/strategy';
import { mockMarketData, mockTrades } from '../data/mockData';
import { usePoloniexData } from '../hooks/usePoloniexData';
import { poloniexApi } from '../services/poloniexAPI';

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialPair = 'BTC/USDT';

  const {
    marketData: apiMarketData,
    trades: apiTrades,
    isLoading,
    error,
    isMockMode,
    refreshApiConnection: refreshConnection,
  } = usePoloniexData(initialPair);

  const [marketData, setMarketData] = useState<MarketData[]>(mockMarketData);
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [strategies, setStrategies] = useState<Strategy[]>([
    // Including a default strategy to demonstrate StrategyType usage
    {
      id: 'default-strategy',
      name: 'MA Crossover Default',
      type: StrategyType.MA_CROSSOVER,
      parameters: {
        pair: 'BTC/USDT',
        shortPeriod: 9,
        longPeriod: 21,
      },
      created: new Date().toISOString(),
      performance: {
        totalPnL: 0,
        winRate: 0,
        tradesCount: 0,
      },
    },
  ]);
  const [activeStrategies, setActiveStrategies] = useState<string[]>([]);
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [errors, setErrors] = useState<string[]>([]);

  // Add an error to the error list
  const addError = useCallback((error: string) => {
    // Avoid adding duplicate errors
    setErrors(prev => {
      if (prev.includes(error)) {
        return prev;
      }
      return [...prev, error];
    });
  }, []);

  // Handle and display errors
  useEffect(() => {
    if (error) {
      addError(error);
    }
  }, [error, addError]);

  // Load market data from API if not in mock mode
  useEffect(() => {
    if (!isMockMode) {
      setMarketData(apiMarketData);
      setTrades(apiTrades);
    }
  }, [isMockMode, apiMarketData, apiTrades]);

  const addStrategy = useCallback((strategy: Strategy) => {
    setStrategies(prev => [...prev, strategy]);
  }, []);

  const removeStrategy = useCallback((id: string) => {
    setStrategies(prev => prev.filter(strategy => strategy.id !== id));
    setActiveStrategies(prev => prev.filter(strategyId => strategyId !== id));
  }, []);

  const toggleStrategyActive = useCallback((id: string) => {
    setActiveStrategies(prev =>
      prev.includes(id) ? prev.filter(strategyId => strategyId !== id) : [...prev, id]
    );
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // API connection refresh
  const refreshApiConnection = useCallback(async (): Promise<void> => {
    try {
      // Removed redundant await since refreshConnection is already awaitable
      refreshConnection();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh API connection';
      addError(errorMessage);
    }
  }, [refreshConnection, addError]);

  // Place an order using the Poloniex API
  const placeOrder = useCallback(
    async (
      pair: string,
      side: 'buy' | 'sell',
      type: 'limit' | 'market',
      quantity: number,
      price?: number
    ) => {
      try {
        if (isMockMode) {
          console.log('Using mock order placement', { pair, side, type, quantity, price });
          // Update account balance based on the order (for mock simulation)
          const orderAmount = quantity * (price ?? 0);
          if (side === 'buy') {
            setAccountBalance(prev => prev - orderAmount);
          } else {
            setAccountBalance(prev => prev + orderAmount);
          }

          return {
            orderId: 'mock-order-' + Date.now(),
            status: 'success',
          };
        }

        const result = await poloniexApi.placeOrder(pair, side, type, quantity, price ?? 0);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error placing order';
        addError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [isMockMode, addError]
  );

  const contextValue = useMemo(
    () => ({
      marketData,
      trades,
      strategies,
      activeStrategies,
      accountBalance,
      isLoading,
      isMockMode,
      refreshApiConnection,
      addStrategy,
      removeStrategy,
      toggleStrategyActive,
      placeOrder,
      errors,
      addError,
      clearErrors,
    }),
    [
      marketData,
      trades,
      strategies,
      activeStrategies,
      accountBalance,
      isLoading,
      isMockMode,
      refreshApiConnection,
      addStrategy,
      removeStrategy,
      toggleStrategyActive,
      placeOrder,
      errors,
      addError,
      clearErrors,
    ]
  );

  return <TradingContext.Provider value={contextValue}>{children}</TradingContext.Provider>;
};

// Export the context for use in the hook file
export default TradingContext;
