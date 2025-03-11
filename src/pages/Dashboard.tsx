import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import PriceChart from '../components/charts/PriceChart';
import Navbar from '../components/Navbar';
import { 
  TrendingUp, 
  BarChart4, 
  DollarSign, 
  Zap, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { MarketData } from '../types';

// Generate mock market data for testing
const generateMockMarketData = (count = 20, pair = 'BTC-USDT'): MarketData[] => {
  const startPrice = pair.includes('BTC') ? 45000 : pair.includes('ETH') ? 3000 : 100;
  const startTime = Date.now() - count * 60000; // minutes ago

  return Array.from({ length: count }).map((_, index) => {
    const timestamp = startTime + index * 60000;
    const volatility = Math.random() * 100 - 50; // random price movement
    const open = startPrice + index * 10 + volatility;
    const high = open + Math.random() * 50;
    const low = open - Math.random() * 50;
    const close = (open + high + low) / 3 + (Math.random() * 20 - 10);
    const volume = 10000 + Math.random() * 5000;

    return {
      pair,
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    };
  });
};

// Generate mock trades for display
const generateMockTrades = (count = 5) => {
  const pairs = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
  const now = Date.now();

  return Array.from({ length: count }).map((_, index) => {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const price = pair.includes('BTC')
      ? 45000 + Math.random() * 1000
      : pair.includes('ETH')
        ? 3000 + Math.random() * 200
        : 100 + Math.random() * 20;

    return {
      id: `trade-${Date.now()}-${index}`,
      pair,
      timestamp: now - index * 3600000,
      type,
      price,
      amount: 0.1 + Math.random() * 2,
      total: price * (0.1 + Math.random() * 2),
      status: 'COMPLETED',
    };
  });
};

// Dashboard component with multiple sections
const Dashboard: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    loadMarketData();
    setTrades(generateMockTrades());
  }, []);

  // Load data for selected pair
  const loadMarketData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API fetch
      setTimeout(() => {
        setMarketData(generateMockMarketData(30, selectedPair));
        setIsLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to load market data');
      setIsLoading(false);
    }
  }, [selectedPair]);

  // Change selected pair and reload data
  const changePair = (pair: string) => {
    setSelectedPair(pair);
    // Generating new data will happen in the useEffect triggered by selectedPair change
  };

  // Update market data when selected pair changes
  useEffect(() => {
    loadMarketData();
  }, [selectedPair, loadMarketData]);

  // Calculate current price and stats
  const currentPrice = marketData.length > 0 
    ? marketData[marketData.length - 1].close 
    : 0;
    
  const previousPrice = marketData.length > 1 
    ? marketData[marketData.length - 2].close 
    : currentPrice;
    
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0;
  const isPriceUp = priceChange >= 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Dashboard</h1>
          
          <div className="mt-4 md:mt-0 flex items-center">
            <button 
              onClick={loadMarketData}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm mr-3"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Current Price</h3>
              <DollarSign className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                ${currentPrice.toFixed(2)}
              </span>
              <span className={`ml-2 text-sm font-medium ${isPriceUp ? 'text-green-600' : 'text-red-600'}`}>
                {isPriceUp ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              24h change: {isPriceUp ? '+' : ''}{priceChange.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Trade Volume</h3>
              <BarChart4 className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                ${(marketData.reduce((sum, data) => sum + data.volume, 0) / 1000000).toFixed(2)}M
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Active Strategies</h3>
              <Zap className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {(Math.random() * 10).toFixed(0)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Performing well: {(Math.random() * 5).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Market selector and Chart section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4 sm:mb-0">
                <TrendingUp className="inline-block h-5 w-5 mr-2 text-blue-500" />
                Price Chart: {selectedPair}
              </h2>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => changePair('BTC-USDT')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedPair === 'BTC-USDT'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  BTC-USDT
                </button>
                <button
                  onClick={() => changePair('ETH-USDT')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedPair === 'ETH-USDT'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  ETH-USDT
                </button>
                <button
                  onClick={() => changePair('SOL-USDT')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedPair === 'SOL-USDT'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  SOL-USDT
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-4 h-[400px]">
            <ErrorBoundary 
              fallback={
                <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded">
                  Chart failed to load. Please try again.
                </div>
              }
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading chart data...
                </div>
              ) : marketData.length > 0 ? (
                <PriceChart data={marketData} pair={selectedPair} />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  No data available. Please try another pair.
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>

        {/* Recent trades section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">
              <Clock className="inline-block h-5 w-5 mr-2 text-blue-500" />
              Recent Trades
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pair
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {trades.map((trade, index) => (
                  <tr key={trade.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {trade.pair}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trade.type === 'BUY' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-300">
                      ${trade.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-300">
                      {trade.amount.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                      ${trade.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
