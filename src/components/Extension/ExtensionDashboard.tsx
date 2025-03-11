import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Server,
  TrendingUp,
  Clock,
  Download,
  Share2,
  MonitorSmartphone,
  PieChart,
  Check,
  AlertTriangle,
  RefreshCw,
  Layers,
  Globe,
} from 'lucide-react';
import ExtensionStatus from './ExtensionStatus';
import {
  createExtensionZip,
  safelySendExtensionMessage,
  isExtensionAvailable,
} from '../../utils/extensionHelper';
import { PoloniexData, PoloniexTrade, TradingViewData } from '../../types';

interface ExtensionDashboardProps {
  onExtensionStatusChange?: (isConnected: boolean) => void;
}

const ExtensionDashboard: React.FC<ExtensionDashboardProps> = ({ onExtensionStatusChange }) => {
  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(false);
  const [poloniexData, setPoloniexData] = useState<PoloniexData | null>(null);
  const [tradingViewData, setTradingViewData] = useState<TradingViewData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check extension status on mount
  useEffect(() => {
    checkExtensionConnection();
    const interval = setInterval(refreshData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [checkExtensionConnection, refreshData]);

  // Refresh data from extension
  const refreshData = useCallback(async () => {
    if (!isExtensionConnected) return;

    setIsRefreshing(true);
    try {
      // Get Poloniex data if available
      try {
        const poloData = await safelySendExtensionMessage<PoloniexData>(
          { type: 'GET_POLONIEX_DATA' },
          5000,
          true // Suppress connection errors
        );

        if (poloData) {
          setPoloniexData(poloData);
        }
      } catch (error) {
        console.error('Error fetching Poloniex data:', error);
      }

      // Get TradingView data if available
      try {
        const tvData = await safelySendExtensionMessage<TradingViewData>(
          { type: 'GET_TRADINGVIEW_DATA' },
          5000,
          true // Suppress connection errors
        );

        if (tvData) {
          setTradingViewData(tvData);
        }
      } catch (error) {
        console.error('Error fetching TradingView data:', error);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isExtensionConnected]);

  // Check if extension is connected
  const checkExtensionConnection = useCallback(async () => {
    try {
      const isConnected = await isExtensionAvailable();
      setIsExtensionConnected(isConnected);

      if (onExtensionStatusChange) {
        onExtensionStatusChange(isConnected);
      }

      if (isConnected) {
        refreshData();
      }
    } catch (error) {
      console.error('Error checking extension connection:', error);
      setIsExtensionConnected(false);
    }
  }, [onExtensionStatusChange, refreshData]);

  // Handle extension download
  const handleDownload = async () => {
    try {
      await createExtensionZip();
    } catch (error) {
      console.error('Error creating extension zip:', error);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Extension Status */}
        <div className="lg:col-span-1">
          <ExtensionStatus onRefreshRequest={checkExtensionConnection} />
        </div>

        {/* Extension Value Proposition */}
        <div className="lg:col-span-2 bg-blue-50 rounded-lg shadow p-4">
          <h3 className="text-lg font-medium flex items-center mb-3">
            <Zap className="h-5 w-5 mr-2 text-blue-500" />
            Extension Benefits
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <TrendingUp className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h4 className="font-medium">Live Trading Data</h4>
                <p className="text-sm text-gray-600">
                  Connect to platforms and extract real-time trading data directly.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <Layers className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <h4 className="font-medium">Cross-Platform Trading</h4>
                <p className="text-sm text-gray-600">
                  Execute trades from TradingView charts or Poloniex directly.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <Globe className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <h4 className="font-medium">Unified Dashboard</h4>
                <p className="text-sm text-gray-600">
                  See all your trading activity across platforms in one place.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-amber-100 p-2 rounded-full mr-3">
                <PieChart className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-medium">Portfolio Tracking</h4>
                <p className="text-sm text-gray-600">
                  Automatically track and analyze your portfolio performance.
                </p>
              </div>
            </div>
          </div>

          {!isExtensionConnected && (
            <button
              onClick={handleDownload}
              className="mt-4 w-full flex items-center justify-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Extension
            </button>
          )}
        </div>
      </div>

      {/* Platform Data Panels */}
      {isExtensionConnected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Poloniex Data */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium flex items-center">
                <Server className="h-5 w-5 mr-2 text-blue-500" />
                Poloniex Integration
              </h3>
              <div className="flex items-center">
                {poloniexData ? (
                  <span className="flex items-center text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Connected
                  </span>
                )}
                <button
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="ml-2 p-1.5 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {poloniexData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500">Account Balance</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(poloniexData.balance || 0)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500">Open Positions</div>
                    <div className="text-lg font-semibold">{poloniexData.openPositions || 0}</div>
                  </div>
                </div>

                {poloniexData.recentTrades && poloniexData.recentTrades.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recent Trades</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pair
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Side
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {poloniexData.recentTrades
                            .slice(0, 5)
                            .map((trade: PoloniexTrade, i: number) => (
                              <tr key={i}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {trade.pair}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${
                                      trade.side === 'buy'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {trade.side === 'buy' ? 'Buy' : 'Sell'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {formatCurrency(trade.price)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {trade.amount}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>Please visit Poloniex and connect the extension</p>
                <a
                  href="https://poloniex.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                >
                  Open Poloniex
                </a>
              </div>
            )}
          </div>

          {/* TradingView Data */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                TradingView Integration
              </h3>
              <div className="flex items-center">
                {tradingViewData ? (
                  <span className="flex items-center text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Connected
                  </span>
                )}
                <button
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="ml-2 p-1.5 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {tradingViewData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500">Current Symbol</div>
                    <div className="text-lg font-semibold">
                      {tradingViewData.currentSymbol || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500">Timeframe</div>
                    <div className="text-lg font-semibold">
                      {tradingViewData.timeframe || 'N/A'}
                    </div>
                  </div>
                </div>

                {tradingViewData.indicators && tradingViewData.indicators.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Active Indicators</h4>
                    <div className="flex flex-wrap gap-2">
                      {tradingViewData.indicators.map((indicator: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {tradingViewData.chartData && (
                  <div>
                    <h4 className="font-medium mb-2">Chart Data</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Open:</span>{' '}
                        {formatCurrency(tradingViewData.chartData.open)}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Close:</span>{' '}
                        {formatCurrency(tradingViewData.chartData.close)}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">High:</span>{' '}
                        {formatCurrency(tradingViewData.chartData.high)}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Low:</span>{' '}
                        {formatCurrency(tradingViewData.chartData.low)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>Please visit TradingView and connect the extension</p>
                <a
                  href="https://www.tradingview.com/chart/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                >
                  Open TradingView
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extension Integration Features */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium flex items-center mb-4">
          <MonitorSmartphone className="h-5 w-5 mr-2 text-blue-500" />
          Extension Integration Features
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-md p-3">
            <div className="flex items-center mb-2">
              <div className="bg-indigo-100 p-2 rounded-full mr-2">
                <Share2 className="h-4 w-4 text-indigo-700" />
              </div>
              <h4 className="font-medium">One-Click Trading</h4>
            </div>
            <p className="text-sm text-gray-600">
              Execute trades with a single click directly from TradingView charts or Poloniex order
              book.
            </p>
          </div>

          <div className="border border-gray-200 rounded-md p-3">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 p-2 rounded-full mr-2">
                <PieChart className="h-4 w-4 text-green-700" />
              </div>
              <h4 className="font-medium">Portfolio Analysis</h4>
            </div>
            <p className="text-sm text-gray-600">
              Automatically track and analyze your portfolio performance across multiple platforms.
            </p>
          </div>

          <div className="border border-gray-200 rounded-md p-3">
            <div className="flex items-center mb-2">
              <div className="bg-amber-100 p-2 rounded-full mr-2">
                <Clock className="h-4 w-4 text-amber-700" />
              </div>
              <h4 className="font-medium">Real-time Alerts</h4>
            </div>
            <p className="text-sm text-gray-600">
              Get instant notifications for price movements, order executions, and trading
              opportunities.
            </p>
          </div>
        </div>

        {!isExtensionConnected && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleDownload}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Extension
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtensionDashboard;
