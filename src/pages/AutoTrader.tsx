import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AutoTradingDashboard from '../components/AutoTradingDashboard';
import { useTradingContext } from '../hooks/useTradingContext';
import ExtensionStatus from '../components/Extension/ExtensionStatus';
import { isExtensionAvailable } from '../utils/extensionHelper';
import { BookOpen, Download, AlertTriangle } from 'lucide-react';

const AutoTrader: React.FC = () => {
  const navigate = useNavigate();
  const { strategies } = useTradingContext();
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(null);

  // Check extension status
  React.useEffect(() => {
    const checkExtension = async () => {
      const isAvailable = await isExtensionAvailable();
      setIsExtensionInstalled(isAvailable);
    };

    checkExtension();
  }, []);

  // Navigate to strategy details
  const handleShowStrategyDetails = (strategyId: string) => {
    navigate(`/strategies?id=${strategyId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Automated Trading System</h1>
        <button
          onClick={() => window.open('/docs/automated-trading', '_blank')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <BookOpen className="h-4 w-4 mr-1" />
          View Documentation
        </button>
      </div>

      {/* Extension warning if not installed */}
      {isExtensionInstalled === false && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 flex">
          <AlertTriangle className="h-5 w-5 text-amber-400 mr-2 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-amber-800 font-medium">Extension Required</h3>
            <p className="text-amber-700 text-sm mb-2">
              The Chrome extension is required for automated trading to function properly. Without
              it, the system can't access real-time market data or execute trades.
            </p>
            <button
              onClick={() => navigate('/extension')}
              className="inline-flex items-center px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm rounded"
            >
              <Download className="h-4 w-4 mr-1" />
              Install Extension
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Auto Trading Dashboard */}
        <div className="lg:col-span-3">
          <AutoTradingDashboard onShowDetails={handleShowStrategyDetails} />
        </div>

        {/* Sidebar with extension status and help */}
        <div className="space-y-4">
          <ExtensionStatus onRefreshRequest={() => {}} />

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">Quick Help</h3>
            <div className="space-y-3">
              <div className="border-l-4 border-blue-400 pl-3 py-1">
                <h4 className="text-sm font-medium">Strategy Discovery</h4>
                <p className="text-xs text-gray-600">
                  Automatically discovers profitable trading strategies by analyzing historical data
                  and optimizing with machine learning.
                </p>
              </div>

              <div className="border-l-4 border-purple-400 pl-3 py-1">
                <h4 className="text-sm font-medium">Validation</h4>
                <p className="text-xs text-gray-600">
                  Tests discovered strategies in demo mode with real market conditions to ensure
                  consistent performance.
                </p>
              </div>

              <div className="border-l-4 border-green-400 pl-3 py-1">
                <h4 className="text-sm font-medium">Live Trading</h4>
                <p className="text-xs text-gray-600">
                  Executes validated strategies with real money, managing risk and optimizing for
                  best returns.
                </p>
              </div>
            </div>

            <button
              onClick={() => window.open('/docs/quick-start', '_blank')}
              className="w-full mt-4 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded flex items-center justify-center"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Read Quick Start Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTrader;
