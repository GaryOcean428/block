import { useState, useEffect, useCallback } from 'react';
import { poloniexApi } from '../services/poloniexAPI';
import type { MarketData, Trade } from '../types/index';
import { webSocketService } from '../services/websocketService';
import { mockMarketData, mockTrades } from '../data/mockData';
import { useSettings } from '../context/SettingsContext';

// Check if we're running in a WebContainer environment
const IS_WEBCONTAINER =
  typeof window !== 'undefined' && window.location?.hostname.includes('webcontainer-api.io');

interface PoloniexDataHook {
  marketData: MarketData[];
  trades: Trade[];
  accountBalance: number;
  isLoading: boolean;
  error: string | null;
  isMockMode: boolean;
  fetchMarketData: (pair: string) => Promise<void>;
  fetchTrades: (pair: string) => Promise<void>;
  fetchAccountBalance: () => Promise<void>;
  refreshApiConnection: () => Promise<void>;
}

// Interface for API responses
interface PoloniexDataItem {
  ts?: number;
  timestamp?: number;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume: string | number;
  quoteVolume?: string | number;
}

interface PoloniexTradeItem {
  id?: string;
  ts?: number;
  timestamp?: number;
  takerSide?: string;
  price: string | number;
  quantity?: string | number;
  amount?: string | number;
}

// Custom hook for managing Poloniex data
export function usePoloniexData(initialPair: string = 'BTC-USDT'): PoloniexDataHook {
  // State for storing market data
  const [marketData, setMarketData] = useState<MarketData[]>(mockMarketData);
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isLiveTrading } = useSettings();
  const [isMockMode, setIsMockMode] = useState<boolean>(true);

  // Map API data format to our MarketData format
  const mapPoloniexDataToMarketData = useCallback(
    (pair: string) =>
      (item: PoloniexDataItem): MarketData => ({
        pair,
        timestamp: item.ts ?? item.timestamp ?? Date.now(),
        open: typeof item.open === 'number' ? item.open : Number(item.open) || 0,
        high: typeof item.high === 'number' ? item.high : Number(item.high) || 0,
        low: typeof item.low === 'number' ? item.low : Number(item.low) || 0,
        close: typeof item.close === 'number' ? item.close : Number(item.close) || 0,
        volume: typeof item.volume === 'number' ? item.volume : Number(item.volume) || 0,
        quoteVolume: item.quoteVolume
          ? typeof item.quoteVolume === 'number'
            ? item.quoteVolume
            : Number(item.quoteVolume)
          : 0,
      }),
    []
  );

  // Map API trade format to our Trade format
  const mapPoloniexTradeToTrade = useCallback(
    (pair: string) =>
      (item: PoloniexTradeItem): Trade => {
        const price = typeof item.price === 'number' ? item.price : Number(item.price) || 0;
        const amount = item.quantity
          ? typeof item.quantity === 'number'
            ? item.quantity
            : Number(item.quantity)
          : item.amount
            ? typeof item.amount === 'number'
              ? item.amount
              : Number(item.amount)
            : 0;

        return {
          id: item.id ?? `mock-${Date.now()}-${Math.random()}`,
          pair,
          timestamp: item.ts ?? item.timestamp ?? Date.now(),
          type: item.takerSide === 'sell' ? 'BUY' : 'SELL',
          price,
          amount,
          total: price * amount,
          strategyId: 'manual',
          status: 'COMPLETED',
        };
      },
    []
  );

  // Fetch market data from API
  const fetchMarketData = useCallback(
    async (pair: string): Promise<void> => {
      if (isMockMode) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Use existing API methods from poloniexApi
        const response = await poloniexApi.getMarketData(pair);

        if (response && Array.isArray(response)) {
          // Map API response to our MarketData format
          const formatted = response.map(mapPoloniexDataToMarketData(pair));
          setMarketData(formatted);
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching market data';
        setError(errorMessage);
        console.error('Market Data Error:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isMockMode, mapPoloniexDataToMarketData]
  );

  // Fetch trades from API
  const fetchTrades = useCallback(
    async (pair: string): Promise<void> => {
      if (isMockMode) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Use existing API methods from poloniexApi
        const response = await poloniexApi.getRecentTrades(pair);

        if (response && Array.isArray(response)) {
          // Map API response to our Trade format
          const formatted = response.map(mapPoloniexTradeToTrade(pair));
          setTrades(formatted);
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching trades';
        setError(errorMessage);
        console.error('Trades Error:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isMockMode, mapPoloniexTradeToTrade]
  );

  // Fetch account balance from API
  const fetchAccountBalance = useCallback(async (): Promise<void> => {
    if (isMockMode) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use existing API methods from poloniexApi
      const response = await poloniexApi.getAccountBalance();

      if (response && typeof response.totalAmount === 'string') {
        setAccountBalance(parseFloat(response.totalAmount));
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching account balance';
      setError(errorMessage);
      console.error('Balance Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isMockMode]);

  // Refresh API connection
  const refreshApiConnection = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Load credentials for real API usage
      poloniexApi.loadCredentials();

      // Test connection by trying to fetch market data
      try {
        await fetchMarketData(initialPair);
        await fetchTrades(initialPair);
        await fetchAccountBalance();
        setIsMockMode(false);
      } catch {
        console.error('Connection test failed, using mock data');
        setMarketData(mockMarketData);
        setTrades(mockTrades);
        setIsMockMode(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error connecting to API';
      setError(errorMessage);
      console.error('API Connection Error:', errorMessage);

      // Fall back to mock data on error
      setMarketData(mockMarketData);
      setTrades(mockTrades);
      setIsMockMode(true);
    } finally {
      setIsLoading(false);
    }
  }, [initialPair, fetchMarketData, fetchTrades, fetchAccountBalance]);

  // Initialize the connection to the API
  useEffect(() => {
    // Check if we should use mock data or real API
    const shouldUseMockData = IS_WEBCONTAINER || !isLiveTrading;
    setIsMockMode(shouldUseMockData);

    if (!shouldUseMockData) {
      // Initialize the API connection if not using mock data
      refreshApiConnection();
    }
  }, [isLiveTrading, refreshApiConnection]);

  // Initial setup and websocket connection
  useEffect(() => {
    if (isMockMode) {
      return;
    }

    // Set up websocket connection for real-time updates
    webSocketService.connect();

    // Instead of trying to access the socket directly, use the on/off event system
    // provided by the webSocketService
    webSocketService.on('marketData', (data: PoloniexDataItem) => {
      try {
        const newCandle = mapPoloniexDataToMarketData(initialPair)(data);
        setMarketData(prev => [...prev, newCandle]);
      } catch (err) {
        console.error('Error processing market data:', err);
      }
    });

    webSocketService.on('tradeExecuted', (data: PoloniexTradeItem) => {
      try {
        const newTrade = mapPoloniexTradeToTrade(initialPair)(data);
        setTrades(prev => [...prev, newTrade]);
      } catch (err) {
        console.error('Error processing trade data:', err);
      }
    });

    // Clean up websocket on unmount
    return () => {
      webSocketService.off('marketData', () => {});
      webSocketService.off('tradeExecuted', () => {});
      webSocketService.disconnect();
    };
  }, [isMockMode, initialPair, mapPoloniexDataToMarketData, mapPoloniexTradeToTrade]);

  return {
    marketData,
    trades,
    accountBalance,
    isLoading,
    error,
    isMockMode,
    fetchMarketData,
    fetchTrades,
    fetchAccountBalance,
    refreshApiConnection,
  };
}
