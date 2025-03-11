import React, { useState } from 'react';
import { useTradingContext } from '../../hooks/useTradingContext';
import { StrategyType, type Strategy, type StrategyParameters } from '../../types/strategy';
import { X, Info } from 'lucide-react';

interface NewStrategyFormProps {
  onClose: () => void;
}

const NewStrategyForm: React.FC<NewStrategyFormProps> = ({ onClose }) => {
  const { addStrategy } = useTradingContext();
  const [name, setName] = useState('');
  const [type, setType] = useState<StrategyType>(StrategyType.MA_CROSSOVER);
  const [pair, setPair] = useState('BTC-USDT');
  const [showHelp, setShowHelp] = useState(false);

  // MA Crossover parameters
  const [shortPeriod, setShortPeriod] = useState(10);
  const [longPeriod, setLongPeriod] = useState(50);

  // RSI parameters
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [overbought, setOverbought] = useState(70);
  const [oversold, setOversold] = useState(30);

  // Breakout parameters
  const [lookbackPeriod, setLookbackPeriod] = useState(24);
  const [breakoutThreshold, setBreakoutThreshold] = useState(2.5);

  // MACD parameters
  const [fastPeriod, setFastPeriod] = useState(12);
  const [slowPeriod, setSlowPeriod] = useState(26);
  const [signalPeriod, setSignalPeriod] = useState(9);

  // Bollinger Bands parameters
  const [bbPeriod, setBbPeriod] = useState(20);
  const [standardDeviations, setStandardDeviations] = useState(2);

  // Ichimoku parameters
  const [conversionPeriod, setConversionPeriod] = useState(9);
  const [basePeriod, setBasePeriod] = useState(26);
  const [laggingSpanPeriod, setLaggingSpanPeriod] = useState(52);
  const [displacement, setDisplacement] = useState(26);

  // Pattern Recognition parameters
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(['engulfing', 'hammer']);
  const [confirmationPeriod, setConfirmationPeriod] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let parameters: StrategyParameters = { pair };

    switch (type) {
      case StrategyType.MA_CROSSOVER:
        parameters = {
          ...parameters,
          shortPeriod,
          longPeriod,
        };
        break;
      case StrategyType.RSI:
        parameters = {
          ...parameters,
          period: rsiPeriod,
          overbought,
          oversold,
        };
        break;
      case StrategyType.BREAKOUT:
        parameters = {
          ...parameters,
          lookbackPeriod,
          breakoutThreshold,
        };
        break;
      case StrategyType.MACD:
        parameters = {
          ...parameters,
          fastPeriod,
          slowPeriod,
          signalPeriod,
        };
        break;
      case StrategyType.BOLLINGER_BANDS:
        parameters = {
          ...parameters,
          period: bbPeriod,
          standardDeviations,
        };
        break;
      case StrategyType.ICHIMOKU:
        parameters = {
          ...parameters,
          conversionPeriod,
          basePeriod,
          laggingSpanPeriod,
          displacement,
        };
        break;
      case StrategyType.PATTERN_RECOGNITION:
        parameters = {
          ...parameters,
          patterns: selectedPatterns,
          confirmationPeriod,
        };
        break;
    }

    const newStrategy: Strategy = {
      id: Date.now().toString(),
      name,
      type,
      parameters,
      created: new Date().toISOString(),
      performance: {
        totalPnL: 0,
        winRate: 0,
        tradesCount: 0,
      },
    };

    addStrategy(newStrategy);
    onClose();
  };

  const renderStrategyHelp = () => {
    if (!showHelp) return null;

    let helpText = '';

    switch (type) {
      case StrategyType.MA_CROSSOVER:
        helpText =
          'Moving Average Crossover generates signals when a faster moving average crosses a slower one. Buy when short MA crosses above long MA, sell when it crosses below.';
        break;
      case StrategyType.RSI:
        helpText =
          'Relative Strength Index measures momentum. Buy when RSI crosses above oversold level, sell when it crosses below overbought level.';
        break;
      case StrategyType.BREAKOUT:
        helpText =
          'Breakout strategy identifies when price breaks through significant support or resistance levels. Buy on upward breakouts, sell on downward breakouts.';
        break;
      case StrategyType.MACD:
        helpText =
          'Moving Average Convergence Divergence uses the difference between two EMAs to identify momentum changes. Buy when MACD crosses above signal line, sell when it crosses below.';
        break;
      case StrategyType.BOLLINGER_BANDS:
        helpText =
          'Bollinger Bands use standard deviations to create dynamic support and resistance levels. Buy when price touches lower band, sell when it touches upper band.';
        break;
      case StrategyType.ICHIMOKU:
        helpText =
          'Ichimoku Cloud is a comprehensive indicator that provides support/resistance, momentum, and trend direction. Buy on TK cross above cloud, sell on TK cross below cloud.';
        break;
      case StrategyType.PATTERN_RECOGNITION:
        helpText =
          'Pattern Recognition identifies specific candlestick patterns that may indicate reversals or continuations. Buy on bullish patterns, sell on bearish patterns.';
        break;
    }

    return (
      <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-800">
        <h4 className="font-medium mb-1">Strategy Information</h4>
        <p>{helpText}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Create New Strategy</h2>
        <button
          className="p-1.5 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Strategy Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 block w-full input"
              placeholder="My Trading Strategy"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700">Strategy Type</label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <select
                value={type}
                onChange={e => setType(e.target.value as StrategyType)}
                className="mt-1 block w-full select"
              >
                <option value={StrategyType.MA_CROSSOVER}>Moving Average Crossover</option>
                <option value={StrategyType.RSI}>RSI</option>
                <option value={StrategyType.BREAKOUT}>Breakout</option>
                <option value={StrategyType.MACD}>MACD</option>
                <option value={StrategyType.BOLLINGER_BANDS}>Bollinger Bands</option>
                <option value={StrategyType.ICHIMOKU}>Ichimoku Cloud</option>
                <option value={StrategyType.PATTERN_RECOGNITION}>Pattern Recognition</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Trading Pair</label>
              <select
                value={pair}
                onChange={e => setPair(e.target.value)}
                className="mt-1 block w-full select"
              >
                <option value="BTC-USDT">BTC-USDT</option>
                <option value="ETH-USDT">ETH-USDT</option>
                <option value="SOL-USDT">SOL-USDT</option>
                <option value="DOGE-USDT">DOGE-USDT</option>
                <option value="XRP-USDT">XRP-USDT</option>
              </select>
            </div>
          </div>

          {renderStrategyHelp()}

          {type === StrategyType.MA_CROSSOVER && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium mb-3">Moving Average Crossover Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Short Period</label>
                  <input
                    type="number"
                    value={shortPeriod}
                    onChange={e => setShortPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    max={longPeriod - 1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Long Period</label>
                  <input
                    type="number"
                    value={longPeriod}
                    onChange={e => setLongPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min={shortPeriod + 1}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {type === StrategyType.RSI && (
            <div className="bg-purple-50 p-4 rounded-md">
              <h3 className="font-medium mb-3">RSI Parameters</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period</label>
                  <input
                    type="number"
                    value={rsiPeriod}
                    onChange={e => setRsiPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Overbought</label>
                  <input
                    type="number"
                    value={overbought}
                    onChange={e => setOverbought(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min={oversold + 1}
                    max="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Oversold</label>
                  <input
                    type="number"
                    value={oversold}
                    onChange={e => setOversold(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="0"
                    max={overbought - 1}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {type === StrategyType.BREAKOUT && (
            <div className="bg-orange-50 p-4 rounded-md">
              <h3 className="font-medium mb-3">Breakout Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lookback Period</label>
                  <input
                    type="number"
                    value={lookbackPeriod}
                    onChange={e => setLookbackPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Breakout Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={breakoutThreshold}
                    onChange={e => setBreakoutThreshold(parseFloat(e.target.value))}
                    className="mt-1 block w-full input"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {type === StrategyType.MACD && (
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="font-medium mb-3">MACD Parameters</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fast Period</label>
                  <input
                    type="number"
                    value={fastPeriod}
                    onChange={e => setFastPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    max={slowPeriod - 1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Slow Period</label>
                  <input
                    type="number"
                    value={slowPeriod}
                    onChange={e => setSlowPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min={fastPeriod + 1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Signal Period</label>
                  <input
                    type="number"
                    value={signalPeriod}
                    onChange={e => setSignalPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {type === StrategyType.BOLLINGER_BANDS && (
            <div className="bg-indigo-50 p-4 rounded-md">
              <h3 className="font-medium mb-3">Bollinger Bands Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period</label>
                  <input
                    type="number"
                    value={bbPeriod}
                    onChange={e => setBbPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Standard Deviations
                  </label>
                  <input
                    type="number"
                    value={standardDeviations}
                    onChange={e => setStandardDeviations(parseFloat(e.target.value))}
                    className="mt-1 block w-full input"
                    min="0.5"
                    step="0.1"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {type === StrategyType.ICHIMOKU && (
            <div className="bg-red-50 p-4 rounded-md">
              <h3 className="font-medium mb-3">Ichimoku Cloud Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Conversion Period (Tenkan-sen)
                  </label>
                  <input
                    type="number"
                    value={conversionPeriod}
                    onChange={e => setConversionPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Base Period (Kijun-sen)
                  </label>
                  <input
                    type="number"
                    value={basePeriod}
                    onChange={e => setBasePeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Lagging Span Period
                  </label>
                  <input
                    type="number"
                    value={laggingSpanPeriod}
                    onChange={e => setLaggingSpanPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Displacement</label>
                  <input
                    type="number"
                    value={displacement}
                    onChange={e => setDisplacement(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {type === StrategyType.PATTERN_RECOGNITION && (
            <div className="bg-yellow-50 p-4 rounded-md">
              <h3 className="font-medium mb-3">Pattern Recognition Parameters</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Patterns to Detect
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pattern-doji"
                        checked={selectedPatterns.includes('doji')}
                        onChange={() => {
                          if (selectedPatterns.includes('doji')) {
                            setSelectedPatterns(selectedPatterns.filter(p => p !== 'doji'));
                          } else {
                            setSelectedPatterns([...selectedPatterns, 'doji']);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="pattern-doji" className="ml-2 block text-sm text-gray-700">
                        Doji
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pattern-hammer"
                        checked={selectedPatterns.includes('hammer')}
                        onChange={() => {
                          if (selectedPatterns.includes('hammer')) {
                            setSelectedPatterns(selectedPatterns.filter(p => p !== 'hammer'));
                          } else {
                            setSelectedPatterns([...selectedPatterns, 'hammer']);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="pattern-hammer" className="ml-2 block text-sm text-gray-700">
                        Hammer
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pattern-engulfing"
                        checked={selectedPatterns.includes('engulfing')}
                        onChange={() => {
                          if (selectedPatterns.includes('engulfing')) {
                            setSelectedPatterns(selectedPatterns.filter(p => p !== 'engulfing'));
                          } else {
                            setSelectedPatterns([...selectedPatterns, 'engulfing']);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="pattern-engulfing"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Engulfing
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pattern-morningstar"
                        checked={selectedPatterns.includes('morningstar')}
                        onChange={() => {
                          if (selectedPatterns.includes('morningstar')) {
                            setSelectedPatterns(selectedPatterns.filter(p => p !== 'morningstar'));
                          } else {
                            setSelectedPatterns([...selectedPatterns, 'morningstar']);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="pattern-morningstar"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Morning Star
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pattern-eveningstar"
                        checked={selectedPatterns.includes('eveningstar')}
                        onChange={() => {
                          if (selectedPatterns.includes('eveningstar')) {
                            setSelectedPatterns(selectedPatterns.filter(p => p !== 'eveningstar'));
                          } else {
                            setSelectedPatterns([...selectedPatterns, 'eveningstar']);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="pattern-eveningstar"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Evening Star
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmation Period
                  </label>
                  <input
                    type="number"
                    value={confirmationPeriod}
                    onChange={e => setConfirmationPeriod(parseInt(e.target.value))}
                    className="mt-1 block w-full input"
                    min="1"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of candles to confirm the pattern before generating a signal
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Strategy
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewStrategyForm;
