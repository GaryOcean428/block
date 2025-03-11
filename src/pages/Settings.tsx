import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import Sidebar from '../components/Sidebar';
import SimpleNavbar from '../components/SimpleNavbar';

// Settings interface
interface UserSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  emailAlerts: boolean;
  tradingMode: 'live' | 'paper' | 'mock';
  chartTimeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  riskLevel: 'low' | 'medium' | 'high';
  defaultPair: string;
  apiKeys: {
    poloniex?: { key: string; secret: string };
    tradingview?: { key: string };
  };
}

// Default user settings
const defaultSettings: UserSettings = {
  theme: 'dark',
  notifications: true,
  emailAlerts: false,
  tradingMode: 'mock',
  chartTimeframe: '1h',
  riskLevel: 'medium',
  defaultPair: 'BTC-USDT',
  apiKeys: {},
};

// Settings page component
const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState('general');

  // Load settings on mount
  useEffect(() => {
    // Simulate loading settings from storage/API
    setIsLoading(true);

    setTimeout(() => {
      // In a real app, this would be fetched from an API or local storage
      const savedSettings = localStorage.getItem('tradingAppSettings');

      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(parsedSettings);
        } catch (error) {
          console.error('Failed to parse saved settings:', error);
          // Fall back to defaults
          setSettings(defaultSettings);
        }
      } else {
        // No saved settings, use defaults
        setSettings(defaultSettings);
      }

      setIsLoading(false);
    }, 800);
  }, []);

  // Handle setting changes
  const handleChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle API key changes
  const handleApiKeyChange = (
    exchange: 'poloniex' | 'tradingview',
    keyType: 'key' | 'secret',
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [exchange]: {
          ...prev.apiKeys[exchange],
          [keyType]: value,
        },
      },
    }));
  };

  // Save settings
  const saveSettings = () => {
    setSaveStatus('saving');

    // Simulate API call
    setTimeout(() => {
      try {
        localStorage.setItem('tradingAppSettings', JSON.stringify(settings));
        setSaveStatus('success');

        // Reset status after a delay
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Failed to save settings:', error);
        setSaveStatus('error');
      }
    }, 1000);
  };

  // Reset settings to defaults
  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings(defaultSettings);
      setSaveStatus('idle');
    }
  };

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <SimpleNavbar />

          <div className="flex-1 overflow-y-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

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
                Loading settings...
              </div>
            ) : (
              <div className="settings-content">
                {/* Tabs navigation */}
                <div
                  className="settings-tabs"
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid #ddd',
                    marginBottom: '20px',
                  }}
                >
                  <button
                    onClick={() => setActiveTab('general')}
                    style={{
                      padding: '10px 20px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'general' ? '2px solid #2196f3' : 'none',
                      fontWeight: activeTab === 'general' ? 'bold' : 'normal',
                      cursor: 'pointer',
                    }}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setActiveTab('trading')}
                    style={{
                      padding: '10px 20px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'trading' ? '2px solid #2196f3' : 'none',
                      fontWeight: activeTab === 'trading' ? 'bold' : 'normal',
                      cursor: 'pointer',
                    }}
                  >
                    Trading
                  </button>
                  <button
                    onClick={() => setActiveTab('api')}
                    style={{
                      padding: '10px 20px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'api' ? '2px solid #2196f3' : 'none',
                      fontWeight: activeTab === 'api' ? 'bold' : 'normal',
                      cursor: 'pointer',
                    }}
                  >
                    API Keys
                  </button>
                </div>

                {/* General settings tab */}
                {activeTab === 'general' && (
                  <div className="general-settings">
                    <div className="setting-group" style={{ marginBottom: '20px' }}>
                      <h3>Appearance</h3>
                      <div style={{ marginBottom: '15px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                        >
                          Theme
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleChange('theme', 'light')}
                            style={{
                              padding: '10px 20px',
                              background: settings.theme === 'light' ? '#2196f3' : '#f5f5f5',
                              color: settings.theme === 'light' ? 'white' : '#333',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Light
                          </button>
                          <button
                            onClick={() => handleChange('theme', 'dark')}
                            style={{
                              padding: '10px 20px',
                              background: settings.theme === 'dark' ? '#2196f3' : '#f5f5f5',
                              color: settings.theme === 'dark' ? 'white' : '#333',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Dark
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="setting-group" style={{ marginBottom: '20px' }}>
                      <h3>Notifications</h3>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={settings.notifications}
                            onChange={e => handleChange('notifications', e.target.checked)}
                            style={{ marginRight: '10px' }}
                          />
                          <span>Enable browser notifications</span>
                        </label>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={settings.emailAlerts}
                            onChange={e => handleChange('emailAlerts', e.target.checked)}
                            style={{ marginRight: '10px' }}
                          />
                          <span>Enable email alerts</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trading settings tab */}
                {activeTab === 'trading' && (
                  <div className="trading-settings">
                    <div className="setting-group" style={{ marginBottom: '20px' }}>
                      <h3>Trading Preferences</h3>

                      <div style={{ marginBottom: '15px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                        >
                          Trading Mode
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleChange('tradingMode', 'live')}
                            style={{
                              padding: '10px 20px',
                              background: settings.tradingMode === 'live' ? '#ff5722' : '#f5f5f5',
                              color: settings.tradingMode === 'live' ? 'white' : '#333',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Live Trading
                          </button>
                          <button
                            onClick={() => handleChange('tradingMode', 'paper')}
                            style={{
                              padding: '10px 20px',
                              background: settings.tradingMode === 'paper' ? '#ff9800' : '#f5f5f5',
                              color: settings.tradingMode === 'paper' ? 'white' : '#333',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Paper Trading
                          </button>
                          <button
                            onClick={() => handleChange('tradingMode', 'mock')}
                            style={{
                              padding: '10px 20px',
                              background: settings.tradingMode === 'mock' ? '#4caf50' : '#f5f5f5',
                              color: settings.tradingMode === 'mock' ? 'white' : '#333',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Mock Mode
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                        >
                          Risk Level
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleChange('riskLevel', 'low')}
                            style={{
                              padding: '10px 20px',
                              background: settings.riskLevel === 'low' ? '#4caf50' : '#f5f5f5',
                              color: settings.riskLevel === 'low' ? 'white' : '#333',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Low Risk
                          </button>
                          <button
                            onClick={() => handleChange('riskLevel', 'medium')}
                            style={{
                              padding: '10px 20px',
                              background: settings.riskLevel === 'medium' ? '#ff9800' : '#f5f5f5',
                              color: settings.riskLevel === 'medium' ? 'white' : '#333',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Medium Risk
                          </button>
                          <button
                            onClick={() => handleChange('riskLevel', 'high')}
                            style={{
                              padding: '10px 20px',
                              background: settings.riskLevel === 'high' ? '#f44336' : '#f5f5f5',
                              color: settings.riskLevel === 'high' ? 'white' : '#333',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            High Risk
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                        >
                          Default Chart Timeframe
                        </label>
                        <select
                          value={settings.chartTimeframe}
                          onChange={e => handleChange('chartTimeframe', e.target.value)}
                          style={{
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            width: '200px',
                          }}
                        >
                          <option value="1m">1 Minute</option>
                          <option value="5m">5 Minutes</option>
                          <option value="15m">15 Minutes</option>
                          <option value="1h">1 Hour</option>
                          <option value="4h">4 Hours</option>
                          <option value="1d">1 Day</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                        >
                          Default Trading Pair
                        </label>
                        <select
                          value={settings.defaultPair}
                          onChange={e => handleChange('defaultPair', e.target.value)}
                          style={{
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            width: '200px',
                          }}
                        >
                          <option value="BTC-USDT">BTC-USDT</option>
                          <option value="ETH-USDT">ETH-USDT</option>
                          <option value="SOL-USDT">SOL-USDT</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* API Keys tab */}
                {activeTab === 'api' && (
                  <div className="api-settings">
                    <div className="setting-group" style={{ marginBottom: '20px' }}>
                      <h3>Poloniex API</h3>
                      <div style={{ marginBottom: '15px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                        >
                          API Key
                        </label>
                        <input
                          type="text"
                          value={settings.apiKeys.poloniex?.key || ''}
                          onChange={e => handleApiKeyChange('poloniex', 'key', e.target.value)}
                          placeholder="Enter your Poloniex API key"
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                        >
                          API Secret
                        </label>
                        <input
                          type="password"
                          value={settings.apiKeys.poloniex?.secret || ''}
                          onChange={e => handleApiKeyChange('poloniex', 'secret', e.target.value)}
                          placeholder="Enter your Poloniex API secret"
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <button
                          style={{
                            padding: '10px 20px',
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Test Poloniex Connection
                        </button>
                      </div>
                    </div>

                    <div className="setting-group" style={{ marginBottom: '20px' }}>
                      <h3>TradingView API</h3>
                      <div style={{ marginBottom: '15px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                        >
                          API Key
                        </label>
                        <input
                          type="text"
                          value={settings.apiKeys.tradingview?.key || ''}
                          onChange={e => handleApiKeyChange('tradingview', 'key', e.target.value)}
                          placeholder="Enter your TradingView API key"
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <button
                          style={{
                            padding: '10px 20px',
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Test TradingView Connection
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div
                  className="settings-actions"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '30px',
                    paddingTop: '20px',
                    borderTop: '1px solid #ddd',
                  }}
                >
                  <button
                    onClick={resetSettings}
                    style={{
                      padding: '10px 20px',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset to Defaults
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {saveStatus === 'success' && (
                      <span style={{ color: '#4caf50' }}>Settings saved!</span>
                    )}
                    {saveStatus === 'error' && (
                      <span style={{ color: '#f44336' }}>Failed to save settings</span>
                    )}

                    <button
                      onClick={saveSettings}
                      disabled={saveStatus === 'saving'}
                      style={{
                        padding: '10px 20px',
                        background: saveStatus === 'saving' ? '#9e9e9e' : '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saveStatus === 'saving' ? 'default' : 'pointer',
                      }}
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Settings;
