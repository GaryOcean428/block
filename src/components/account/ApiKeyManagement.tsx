import React, { useState, useEffect } from 'react';
import {
  Copy,
  Plus,
  Trash2,
  AlertTriangle,
  Shield,
  RefreshCw,
  Check,
  X,
  Loader,
} from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { poloniexApi } from '../../services/poloniexAPI';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: {
    read: boolean;
    trade: boolean;
    withdraw: boolean;
  };
  createdAt: string;
  lastUsed: string;
  expiresAt: string | null;
}

const ApiKeyManagement: React.FC = () => {
  const { apiKey, apiSecret, updateSettings } = useSettings();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    permissions: {
      read: true,
      trade: false,
      withdraw: false,
    },
    expiration: 'never',
  });
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'error' | 'checking'
  >('disconnected');
  const [apiPermissions, setApiPermissions] = useState<{
    read: boolean;
    trade: boolean;
    withdraw: boolean;
  }>({
    read: false,
    trade: false,
    withdraw: false,
  });
  const [isVerifying, setIsVerifying] = useState(false);

  // Mock API keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Trading Bot',
      key: apiKey || 'ce8c5f37d8e94a11a3e9bf20e7e92f31',
      permissions: {
        read: true,
        trade: true,
        withdraw: false,
      },
      createdAt: '2023-05-15T14:30:00Z',
      lastUsed: '2023-06-10T09:45:23Z',
      expiresAt: null,
    },
  ]);

  // Check connection status on load
  useEffect(() => {
    if (apiKey && apiSecret) {
      verifyApiConnection();
    }
  }, [apiKey, apiSecret]);

  // Verify API connection
  const verifyApiConnection = async () => {
    if (!apiKey || !apiSecret) {
      setConnectionStatus('disconnected');
      return;
    }

    setIsVerifying(true);
    setConnectionStatus('checking');

    try {
      const result = await poloniexApi.verifyApiCredentials();
      if (result.valid) {
        setConnectionStatus('connected');
        setApiPermissions(result.permissions);
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle form input changes
  const handlePermissionChange = (permission: 'read' | 'trade' | 'withdraw') => {
    setNewKeyForm({
      ...newKeyForm,
      permissions: {
        ...newKeyForm.permissions,
        [permission]: !newKeyForm.permissions[permission],
      },
    });
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Here you might want to show a toast notification
  };

  // Create a new API key
  const handleCreateKey = () => {
    // In a real app, you would call your API here
    const newKey: ApiKey = {
      id: Math.random().toString(36).substring(2, 11),
      name: newKeyForm.name,
      key:
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      permissions: newKeyForm.permissions,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      expiresAt:
        newKeyForm.expiration === 'never'
          ? null
          : new Date(
              Date.now() + parseInt(newKeyForm.expiration) * 24 * 60 * 60 * 1000
            ).toISOString(),
    };

    setApiKeys([...apiKeys, newKey]);
    setShowCreateForm(false);

    // Reset form
    setNewKeyForm({
      name: '',
      permissions: {
        read: true,
        trade: false,
        withdraw: false,
      },
      expiration: 'never',
    });

    // Update settings with the new key
    updateSettings({
      apiKey: newKey.key,
      apiSecret: Math.random().toString(36).substring(2, 30), // In a real app, this would be provided by the exchange
    });

    // Verify the new connection
    setTimeout(() => {
      verifyApiConnection();
    }, 500);
  };

  // Delete API key
  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));

    // If we're deleting the current key, clear the settings
    if (apiKeys.find(key => key.id === id)?.key === apiKey) {
      updateSettings({
        apiKey: '',
        apiSecret: '',
      });
      setConnectionStatus('disconnected');
    }
  };

  // Get connection status badge
  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center text-green-600">
            <Check className="h-4 w-4 mr-1" />
            <span>Connected</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-600">
            <X className="h-4 w-4 mr-1" />
            <span>Connection Error</span>
          </div>
        );
      case 'checking':
        return (
          <div className="flex items-center text-blue-600">
            <Loader className="h-4 w-4 mr-1 animate-spin" />
            <span>Verifying...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-600">
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span>Not Connected</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-blue-700">
        <div className="flex">
          <Shield className="h-6 w-6 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium">API Key Security</h3>
            <p className="mt-1 text-sm">
              Keep your API keys secure. Never share them with others or expose them in client-side
              code. Keys with trade and withdraw permissions should be used with extreme caution.
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Connection Status</h3>
            <div className="mt-2">{getConnectionStatusBadge()}</div>

            {connectionStatus === 'connected' && (
              <div className="mt-2 text-sm">
                <div className="font-medium">Permissions:</div>
                <div className="flex space-x-2 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${apiPermissions.read ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    Read {apiPermissions.read ? '✓' : '✗'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${apiPermissions.trade ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    Trade {apiPermissions.trade ? '✓' : '✗'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${apiPermissions.withdraw ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    Withdraw {apiPermissions.withdraw ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={verifyApiConnection}
            disabled={isVerifying || !apiKey || !apiSecret}
            className={`flex items-center px-3 py-2 rounded-md ${
              isVerifying || !apiKey || !apiSecret
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isVerifying ? (
              <Loader className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Verify Connection
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Your API Keys</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create New Key
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-medium">Create New API Key</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="key-name" className="block text-sm font-medium text-gray-700">
                Key Name
              </label>
              <input
                type="text"
                id="key-name"
                value={newKeyForm.name}
                onChange={e => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Trading Bot"
                required
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Permissions</span>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="permission-read"
                    type="checkbox"
                    checked={newKeyForm.permissions.read}
                    onChange={() => handlePermissionChange('read')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="permission-read" className="ml-2 block text-sm text-gray-700">
                    Read (View account balances and trades)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="permission-trade"
                    type="checkbox"
                    checked={newKeyForm.permissions.trade}
                    onChange={() => handlePermissionChange('trade')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="permission-trade" className="ml-2 block text-sm text-gray-700">
                    Trade (Place and cancel orders)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="permission-withdraw"
                    type="checkbox"
                    checked={newKeyForm.permissions.withdraw}
                    onChange={() => handlePermissionChange('withdraw')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="permission-withdraw"
                    className="ml-2 flex items-center text-sm text-gray-700"
                  >
                    Withdraw (Transfer funds out of your account){' '}
                    <span className="text-red-600 flex items-center text-xs">
                      <AlertTriangle className="h-3 w-3 mr-0.5" />
                      High Risk
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="key-expiration" className="block text-sm font-medium text-gray-700">
                Expiration
              </label>
              <select
                id="key-expiration"
                value={newKeyForm.expiration}
                onChange={e => setNewKeyForm({ ...newKeyForm, expiration: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="never">Never</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="180">180 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateKey}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium">Current API Keys</h3>
          <button
            onClick={() => {}}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  API Key
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Permissions
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Last Used
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Expires
                </th>
                <th scope="col" className="relative px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map(key => (
                <tr key={key.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {key.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <code className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {key.key.slice(0, 8)}...{key.key.slice(-8)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-x-2">
                      {key.permissions.read && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Read
                        </span>
                      )}
                      {key.permissions.trade && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Trade
                        </span>
                      )}
                      {key.permissions.withdraw && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Withdraw
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(key.lastUsed).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManagement;
