import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import Sidebar from '../components/Sidebar';
import SimpleNavbar from '../components/SimpleNavbar';

// Strategy types
enum StrategyType {
  MA_CROSSOVER = 'MA_CROSSOVER',
  RSI = 'RSI',
  MACD = 'MACD',
  BOLLINGER_BANDS = 'BOLLINGER_BANDS',
  ICHIMOKU = 'ICHIMOKU',
}

// Strategy interface
interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  createdAt: number;
  isActive: boolean;
  performance: {
    winRate: number;
    profitLoss: number;
    totalTrades: number;
    averageReturn: number;
  };
  config: Record<string, any>;
  pair: string;
}

// Create mock strategies for display
const generateMockStrategies = (count = 5): Strategy[] => {
  const pairs = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
  const now = Date.now();

  const strategyTypes = [
    StrategyType.MA_CROSSOVER,
    StrategyType.RSI,
    StrategyType.MACD,
    StrategyType.BOLLINGER_BANDS,
    StrategyType.ICHIMOKU,
  ];

  const strategyDescriptions = {
    [StrategyType.MA_CROSSOVER]:
      'Moving average crossover strategy that buys when short MA crosses above long MA and sells when it crosses below.',
    [StrategyType.RSI]:
      'Relative Strength Index strategy that buys when RSI is oversold and sells when overbought.',
    [StrategyType.MACD]:
      'Moving Average Convergence Divergence strategy that trades based on MACD line crossing signal line.',
    [StrategyType.BOLLINGER_BANDS]:
      'Bollinger Bands strategy that buys on lower band touch and sells on upper band touch.',
    [StrategyType.ICHIMOKU]:
      'Ichimoku Cloud strategy that trades based on price position relative to the cloud.',
  };

  return Array.from({ length: count }).map((_, index) => {
    const type = strategyTypes[Math.floor(Math.random() * strategyTypes.length)];
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const isActive = Math.random() > 0.4;
    const winRate = 40 + Math.random() * 40;
    const profitLoss = Math.random() * 2000 - 500;

    return {
      id: `strategy-${now}-${index}`,
      name: `${type} Strategy ${index + 1}`,
      type,
      description: strategyDescriptions[type],
      createdAt: now - Math.random() * 30 * 24 * 60 * 60 * 1000, // Random time in last 30 days
      isActive,
      performance: {
        winRate,
        profitLoss,
        totalTrades: Math.floor(Math.random() * 100) + 10,
        averageReturn: profitLoss / (Math.floor(Math.random() * 100) + 10),
      },
      config:
        type === StrategyType.MA_CROSSOVER
          ? { shortPeriod: 9, longPeriod: 21 }
          : type === StrategyType.RSI
            ? { period: 14, oversold: 30, overbought: 70 }
            : type === StrategyType.MACD
              ? { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
              : type === StrategyType.BOLLINGER_BANDS
                ? { period: 20, stdDev: 2 }
                : { conversion: 9, base: 26, span: 52, displacement: 26 },
      pair,
    };
  });
};

// Strategy card component
const StrategyCard: React.FC<{ strategy: Strategy; onToggle: (id: string) => void }> = ({
  strategy,
  onToggle,
}) => {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: strategy.isActive ? '#f0f8ff' : '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <h3 style={{ margin: 0 }}>{strategy.name}</h3>
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              backgroundColor: strategy.isActive ? '#4caf50' : '#9e9e9e',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              marginRight: '10px',
            }}
          >
            {strategy.isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
          <button
            onClick={() => onToggle(strategy.id)}
            style={{
              background: strategy.isActive ? '#f44336' : '#4caf50',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {strategy.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <div>
          <strong>Type:</strong> {strategy.type}
        </div>
        <div>
          <strong>Pair:</strong> {strategy.pair}
        </div>
        <div>
          <strong>Created:</strong> {new Date(strategy.createdAt).toLocaleDateString()}
        </div>
      </div>

      <p style={{ color: '#666', marginBottom: '15px' }}>{strategy.description}</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          backgroundColor: '#f9f9f9',
          padding: '10px',
          borderRadius: '4px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Win Rate</div>
          <div style={{ fontWeight: 'bold' }}>{strategy.performance.winRate.toFixed(2)}%</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Profit/Loss</div>
          <div
            style={{
              fontWeight: 'bold',
              color: strategy.performance.profitLoss >= 0 ? 'green' : 'red',
            }}
          >
            ${strategy.performance.profitLoss.toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Trades</div>
          <div style={{ fontWeight: 'bold' }}>{strategy.performance.totalTrades}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Avg Return</div>
          <div
            style={{
              fontWeight: 'bold',
              color: strategy.performance.averageReturn >= 0 ? 'green' : 'red',
            }}
          >
            ${strategy.performance.averageReturn.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '15px' }}>
        <h4 style={{ marginBottom: '10px' }}>Configuration</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {Object.entries(strategy.config).map(([key, value]) => (
              <tr key={key} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 0', color: '#666' }}>{key}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          style={{
            padding: '8px 16px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Edit
        </button>
        <button
          style={{
            padding: '8px 16px',
            background: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Backtest
        </button>
      </div>
    </div>
  );
};

// New strategy modal
const NewStrategyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategy: Partial<Strategy>) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<StrategyType>(StrategyType.MA_CROSSOVER);
  const [pair, setPair] = useState('BTC-USDT');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create new strategy with basic settings
    const newStrategy: Partial<Strategy> = {
      name,
      type,
      pair,
      description: `New ${type} strategy for ${pair}`,
      isActive: false,
      config:
        type === StrategyType.MA_CROSSOVER
          ? { shortPeriod: 9, longPeriod: 21 }
          : type === StrategyType.RSI
            ? { period: 14, oversold: 30, overbought: 70 }
            : type === StrategyType.MACD
              ? { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
              : type === StrategyType.BOLLINGER_BANDS
                ? { period: 20, stdDev: 2 }
                : { conversion: 9, base: 26, span: 52, displacement: 26 },
    };

    onSave(newStrategy);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          width: '500px',
          maxWidth: '90%',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Create New Strategy</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Strategy Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Strategy Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as StrategyType)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value={StrategyType.MA_CROSSOVER}>Moving Average Crossover</option>
              <option value={StrategyType.RSI}>RSI</option>
              <option value={StrategyType.MACD}>MACD</option>
              <option value={StrategyType.BOLLINGER_BANDS}>Bollinger Bands</option>
              <option value={StrategyType.ICHIMOKU}>Ichimoku Cloud</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Trading Pair
            </label>
            <select
              value={pair}
              onChange={e => setPair(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="BTC-USDT">BTC-USDT</option>
              <option value="ETH-USDT">ETH-USDT</option>
              <option value="SOL-USDT">SOL-USDT</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Create Strategy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Strategies page
const Strategies: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  // Load strategies on mount
  useEffect(() => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      try {
        const mockStrategies = generateMockStrategies(8);
        setStrategies(mockStrategies);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load strategies');
        setIsLoading(false);
      }
    }, 800);
  }, []);

  // Toggle strategy active status
  const toggleStrategy = (id: string) => {
    setStrategies(prevStrategies =>
      prevStrategies.map(strategy =>
        strategy.id === id ? { ...strategy, isActive: !strategy.isActive } : strategy
      )
    );
  };

  // Add new strategy
  const addStrategy = (newStrategy: Partial<Strategy>) => {
    const strategy: Strategy = {
      id: `strategy-${Date.now()}`,
      name: newStrategy.name || 'Unnamed Strategy',
      type: newStrategy.type || StrategyType.MA_CROSSOVER,
      description: newStrategy.description || '',
      createdAt: Date.now(),
      isActive: newStrategy.isActive || false,
      performance: {
        winRate: 0,
        profitLoss: 0,
        totalTrades: 0,
        averageReturn: 0,
      },
      config: newStrategy.config || {},
      pair: newStrategy.pair || 'BTC-USDT',
    };

    setStrategies(prevStrategies => [...prevStrategies, strategy]);
  };

  // Get filtered strategies
  const filteredStrategies =
    filter === 'all'
      ? strategies
      : filter === 'active'
        ? strategies.filter(s => s.isActive)
        : strategies.filter(s => !s.isActive);

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <SimpleNavbar />

          <div className="flex-1 overflow-y-auto p-6">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h1 className="text-2xl font-bold">Trading Strategies</h1>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Create New Strategy
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  borderBottom: '1px solid #ddd',
                  paddingBottom: '10px',
                }}
              >
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    background: filter === 'all' ? '#2196f3' : '#f5f5f5',
                    color: filter === 'all' ? 'white' : '#333',
                    cursor: 'pointer',
                  }}
                >
                  All Strategies ({strategies.length})
                </button>
                <button
                  onClick={() => setFilter('active')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    background: filter === 'active' ? '#4caf50' : '#f5f5f5',
                    color: filter === 'active' ? 'white' : '#333',
                    cursor: 'pointer',
                  }}
                >
                  Active ({strategies.filter(s => s.isActive).length})
                </button>
                <button
                  onClick={() => setFilter('inactive')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    background: filter === 'inactive' ? '#9e9e9e' : '#f5f5f5',
                    color: filter === 'inactive' ? 'white' : '#333',
                    cursor: 'pointer',
                  }}
                >
                  Inactive ({strategies.filter(s => !s.isActive).length})
                </button>
              </div>
            </div>

            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '300px',
                  fontSize: '18px',
                  color: '#666',
                }}
              >
                Loading strategies...
              </div>
            ) : error ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '300px',
                  fontSize: '18px',
                  color: '#f44336',
                }}
              >
                {error}
              </div>
            ) : filteredStrategies.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '300px',
                  fontSize: '18px',
                  color: '#666',
                }}
              >
                <p>No strategies found</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '20px',
                  }}
                >
                  Create Your First Strategy
                </button>
              </div>
            ) : (
              <div className="strategies-list">
                {filteredStrategies.map(strategy => (
                  <StrategyCard key={strategy.id} strategy={strategy} onToggle={toggleStrategy} />
                ))}
              </div>
            )}

            <NewStrategyModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={addStrategy}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Strategies;
