import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import PriceChart from '../components/charts/PriceChart';
import Sidebar from '../components/Sidebar';
import SimpleNavbar from '../components/SimpleNavbar';

interface MarketData {
  pair: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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
  const loadMarketData = () => {
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
  };

  // Change selected pair and reload data
  const changePair = (pair: string) => {
    setSelectedPair(pair);
    setMarketData(generateMockMarketData(30, pair));
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <SimpleNavbar />

        <div className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl font-bold mb-6">Trading Dashboard</h1>

          {/* Market selector */}
          <div className="market-selector" style={{ marginBottom: '20px' }}>
            <h2>Select Market</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => changePair('BTC-USDT')}
                style={{
                  background: selectedPair === 'BTC-USDT' ? '#4a90e2' : '#333',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                BTC-USDT
              </button>
              <button
                onClick={() => changePair('ETH-USDT')}
                style={{
                  background: selectedPair === 'ETH-USDT' ? '#4a90e2' : '#333',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                ETH-USDT
              </button>
              <button
                onClick={() => changePair('SOL-USDT')}
                style={{
                  background: selectedPair === 'SOL-USDT' ? '#4a90e2' : '#333',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                SOL-USDT
              </button>
            </div>
          </div>

          {/* Chart section */}
          <div className="chart-section" style={{ marginBottom: '40px' }}>
            <h2>Price Chart: {selectedPair}</h2>
            <div
              style={{
                height: '400px',
                border: '1px solid #333',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <ErrorBoundary fallback={<div>Chart failed to load</div>}>
                {isLoading ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                    }}
                  >
                    Loading...
                  </div>
                ) : marketData.length > 0 ? (
                  <PriceChart data={marketData} pair={selectedPair} />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                    }}
                  >
                    No data available
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>

          {/* Recent trades section */}
          <div className="recent-trades-section">
            <h2>Recent Trades</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#333', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Pair</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, index) => (
                  <tr key={trade.id} style={{ background: index % 2 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '10px' }}>{trade.pair}</td>
                    <td style={{ padding: '10px', color: trade.type === 'BUY' ? 'green' : 'red' }}>
                      {trade.type}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      ${trade.price.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {trade.amount.toFixed(4)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      ${trade.total.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
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
