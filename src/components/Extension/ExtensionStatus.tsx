import React, { useState, useEffect } from 'react';
import { Zap, Check, AlertTriangle, RefreshCw, MonitorSmartphone } from 'lucide-react';
import {
  isChromeExtensionApiAvailable,
  safelySendExtensionMessage,
} from '../../utils/extensionHelper';

interface ExtensionStatusProps {
  onRefreshRequest?: () => void;
}

const ExtensionStatus: React.FC<ExtensionStatusProps> = ({ onRefreshRequest }) => {
  const [extensionStatus, setExtensionStatus] = useState<'connected' | 'disconnected' | 'checking'>(
    'checking'
  );
  const [tradingViewStatus, setTradingViewStatus] = useState<
    'connected' | 'disconnected' | 'checking'
  >('checking');
  const [poloniexStatus, setPoloniexStatus] = useState<'connected' | 'disconnected' | 'checking'>(
    'checking'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check extension connection status
  useEffect(() => {
    checkExtensionStatus();
  }, []);

  const checkExtensionStatus = async () => {
    setExtensionStatus('checking');
    setTradingViewStatus('checking');
    setPoloniexStatus('checking');
    setIsRefreshing(true);

    try {
      // First check if the API is available
      if (!isChromeExtensionApiAvailable()) {
        setAllDisconnected();
        return;
      }

      // Check if extension is installed - use our suppression option to handle common errors
      const isAvailable = await isExtensionAvailable();

      if (isAvailable) {
        // The extension might be available but inactive (giving us connection errors)
        if (
          chrome.runtime.lastError &&
          (chrome.runtime.lastError.message.includes('Could not establish connection') ||
            chrome.runtime.lastError.message.includes('Receiving end does not exist'))
        ) {
          // Set to "connected" but with a special status for the sub-components
          setExtensionStatus('connected');
          setTradingViewStatus('disconnected');
          setPoloniexStatus('disconnected');
        } else {
          // Extension responded properly
          setExtensionStatus('connected');

          // Check TradingView connection status - suppress connection errors
          try {
            const tvResponse = await safelySendExtensionMessage<{ connected: boolean }>(
              { type: 'CHECK_TRADINGVIEW_STATUS' },
              3000,
              true // Suppress connection errors
            );

            if (tvResponse === null) {
              // Connection error - extension exists but doesn't handle this message
              setTradingViewStatus('disconnected');
            } else {
              setTradingViewStatus(tvResponse?.connected ? 'connected' : 'disconnected');
            }
          } catch (error) {
            setTradingViewStatus('disconnected');
          }

          // Check Poloniex connection status - suppress connection errors
          try {
            const poloResponse = await safelySendExtensionMessage<{ connected: boolean }>(
              { type: 'CHECK_POLONIEX_STATUS' },
              3000,
              true // Suppress connection errors
            );

            if (poloResponse === null) {
              // Connection error - extension exists but doesn't handle this message
              setPoloniexStatus('disconnected');
            } else {
              setPoloniexStatus(poloResponse?.connected ? 'connected' : 'disconnected');
            }
          } catch (error) {
            setPoloniexStatus('disconnected');
          }
        }
      } else {
        // Extension is definitely not available
        setAllDisconnected();
      }
    } catch (error) {
      console.error('Error checking extension status:', error);
      setAllDisconnected();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to set all statuses to disconnected
  const setAllDisconnected = () => {
    setExtensionStatus('disconnected');
    setTradingViewStatus('disconnected');
    setPoloniexStatus('disconnected');
  };

  const handleRefresh = () => {
    checkExtensionStatus();
    if (onRefreshRequest) {
      onRefreshRequest();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium flex items-center">
          <MonitorSmartphone className="h-5 w-5 mr-2 text-blue-500" />
          Extension Status
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="h-4 w-4 mr-2 text-blue-500" />
            <span className="text-gray-700">Extension</span>
          </div>
          <StatusBadge status={extensionStatus} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg
              className="h-4 w-4 mr-2 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 5L19 12L12 19M5 19L12 12L5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-gray-700">TradingView</span>
          </div>
          <StatusBadge status={tradingViewStatus} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg
              className="h-4 w-4 mr-2 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 6V18M18 12H6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-gray-700">Poloniex</span>
          </div>
          <StatusBadge status={poloniexStatus} />
        </div>
      </div>

      <div className="mt-4 text-sm">
        {extensionStatus === 'disconnected' ? (
          <div className="text-yellow-700 flex items-start">
            <AlertTriangle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            <span>
              Extension not detected. Please install the Chrome extension to enable integration
              features.
            </span>
          </div>
        ) : extensionStatus === 'connected' &&
          (tradingViewStatus === 'disconnected' || poloniexStatus === 'disconnected') ? (
          <div className="text-yellow-700 flex items-start">
            <AlertTriangle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            <span>
              Some integrations are not connected. Please visit TradingView or Poloniex to activate
              them.
            </span>
          </div>
        ) : extensionStatus === 'connected' ? (
          <div className="text-green-700 flex items-start">
            <Check className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            <span>All systems connected. Trading integration is fully operational.</span>
          </div>
        ) : (
          <div className="text-gray-500 flex items-start">
            <RefreshCw className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0 animate-spin" />
            <span>Checking connection status...</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'checking';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'connected':
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Connected
        </span>
      );
    case 'disconnected':
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Disconnected
        </span>
      );
    case 'checking':
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Checking
        </span>
      );
  }
};

export default ExtensionStatus;
