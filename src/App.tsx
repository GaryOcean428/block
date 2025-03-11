import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import './App.css';
// Incrementally add back functionality
import { ErrorBoundary } from './components/ErrorBoundary';
import PriceChart from './components/charts/PriceChart';
import { useAuth } from './hooks/useAuth';

// Generate mock market data for testing
const generateMockMarketData = (count = 20) => {
  const startPrice = 45000;
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
      pair: 'BTC-USDT',
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    };
  });
};

// Simple diagnostic UI with chart functionality
function DiagnosticApp() {
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');
  interface MarketData {
    pair: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }

  const [marketData, setMarketData] = useState<MarketData[]>([]);

  // Initialize with some mock data
  useEffect(() => {
    setMarketData(generateMockMarketData());
  }, []);

  // Simulate fetching market data
  const fetchData = async () => {
    try {
      setStatus('Loading...');
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate new market data
      const newData = generateMockMarketData();
      setMarketData(newData);

      setStatus(`Loaded: BTC-USDT @ ${newData[newData.length - 1].close.toFixed(2)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('Error');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Trading Platform Diagnostic UI</h1>

        {/* Navigation links */}
        <nav style={{ margin: '15px 0', padding: '10px', background: '#222' }}>
          <Link style={{ margin: '0 10px', color: 'white' }} to="/">
            Home
          </Link>
          <Link style={{ margin: '0 10px', color: 'white' }} to="/dashboard">
            Dashboard
          </Link>
          <Link style={{ margin: '0 10px', color: 'white' }} to="/strategies">
            Strategies
          </Link>
          <Link style={{ margin: '0 10px', color: 'white' }} to="/settings">
            Settings
          </Link>
        </nav>

        <div className="status-panel">
          <p>Status: {status}</p>
          {error && <p className="error-message">Error: {error}</p>}
        </div>

        <div className="control-panel">
          <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
          <button onClick={fetchData}>Simulate Data Fetch</button>
          <button onClick={() => setError(null)}>Clear Error</button>
        </div>

        {/* Add price chart with error boundary */}
        <div style={{ width: '100%', maxWidth: '800px', height: '300px', margin: '20px auto' }}>
          <ErrorBoundary fallback={<p>Chart failed to load</p>}>
            {marketData.length > 0 && <PriceChart data={marketData} pair="BTC-USDT" />}
          </ErrorBoundary>
        </div>

        <div className="info-panel">
          <h2>System Information</h2>
          <ul>
            <li>React Version: {React.version}</li>
            <li>Environment: {import.meta.env.MODE}</li>
            <li>Time: {new Date().toLocaleTimeString()}</li>
            <li>Market Data Points: {marketData.length}</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

// Main app that uses ErrorBoundary
function App() {
  const { isAuthenticated, loading } = useAuth();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>The application encountered an error. Please refresh the page or contact support.</p>
        </div>
      }
    >
      <DiagnosticApp />
    </ErrorBoundary>
  );
}

export default App;
