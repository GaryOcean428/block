/**
 * API Services Barrel File
 *
 * Exports all API-related services and types to simplify imports.
 * This pattern improves code organization and maintainability.
 */

// Export all types
export * from './types';

// Export API clients
export { PoloniexClient, PoloniexApiError } from './poloniexClient';
export {
  PoloniexWebSocketClient,
  ConnectionState,
  type WebSocketEventHandlers,
  type WebSocketClientConfig,
} from './webSocketClient';

// Create and export singleton instances

import { PoloniexClient } from './poloniexClient';
import { PoloniexWebSocketClient } from './webSocketClient';
import { ENV_CONFIG } from '@/utils/environment';

// Create singleton API client instance
export const apiClient = new PoloniexClient({
  baseUrl: ENV_CONFIG.poloniexApiUrl,
  // API keys should be loaded from secure storage in a real production app
  // and never hardcoded
});

// Create singleton WebSocket client instance
export const wsClient = new PoloniexWebSocketClient(
  {
    onError: error => {
      console.error('WebSocket connection error:', error);
    },
  },
  {
    url: ENV_CONFIG.websocketUrl,
    autoReconnect: true,
  }
);

// Helper method to initialize API clients with credentials
export const initializeApiClients = (apiKey: string, apiSecret: string): void => {
  // Re-initialize the clients with credentials
  const clientConfig = {
    apiKey,
    apiSecret,
    baseUrl: ENV_CONFIG.poloniexApiUrl,
    timeout: 30000,
    maxRetries: 3,
  };

  // Initialize API client
  Object.assign(apiClient, new PoloniexClient(clientConfig));

  // Initialize WebSocket client
  Object.assign(
    wsClient,
    new PoloniexWebSocketClient(
      {
        onError: error => {
          console.error('WebSocket connection error:', error);
        },
      },
      {
        url: ENV_CONFIG.websocketUrl,
        apiKey,
        apiSecret,
        autoReconnect: true,
      }
    )
  );
};
