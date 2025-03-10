import React, { useCallback, useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTradingContext } from '../hooks/useTradingContext';

interface ExtensionMessageData {
  [key: string]: unknown;
}

interface ExtensionMessage {
  type: string;
  data: ExtensionMessageData;
}

const Integration: React.FC = () => {
  const { addError } = useTradingContext();
  const { apiKey, apiSecret } = useSettings();
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);

  // Use useCallback to memoize the handler function to use it as a dependency
  const handleExtensionMessage = useCallback(
    (event: MessageEvent) => {
      // Ensure message is from our extension
      if (event.source !== window || !event.data || event.data.source !== 'POLONIEX_EXTENSION') {
        return;
      }

      const message = event.data as ExtensionMessage;
      console.log('Received message from extension:', message);

      switch (message.type) {
        case 'PLACE_ORDER':
          // Handle order placement
          console.log('Order received from extension:', message.data);
          // In a real app, this would call your order placement logic
          break;

        case 'SEND_CHAT':
          // Handle chat message
          console.log('Chat message from extension:', message.data);
          // In a real app, this would send the chat message to your backend
          break;

        default:
          addError(`Unknown message type from extension: ${message.type}`);
      }
    },
    [addError]
  );

  useEffect(() => {
    // Check if extension is installed
    try {
      // This is a typical pattern to detect if your extension is installed
      // by attempting to communicate with it
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        // Use the actual extension ID
        const extensionId = 'jcdmopolmojdhpclfbemdpcdneobmnje';

        chrome.runtime.sendMessage(extensionId, { type: 'CHECK_INSTALLATION' }, response => {
          if (response?.installed) {
            setIsExtensionInstalled(true);
            console.log('Extension is installed and connected!');
          } else {
            setIsExtensionInstalled(false);
            console.log('Extension is not installed or not responding');
          }
        });
      }
    } catch (error) {
      console.log('Error checking extension installation:', error);
      setIsExtensionInstalled(false);
    }

    // Set up listener for messages from the extension
    window.addEventListener('message', handleExtensionMessage);

    return () => {
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, [handleExtensionMessage]);

  // Update extension with credentials if available
  useEffect(() => {
    if (
      isExtensionInstalled &&
      apiKey &&
      apiSecret &&
      typeof chrome !== 'undefined' &&
      chrome.runtime?.sendMessage
    ) {
      const extensionId = 'jcdmopolmojdhpclfbemdpcdneobmnje';

      // Send credentials to extension
      chrome.runtime.sendMessage(
        extensionId,
        {
          type: 'UPDATE_CREDENTIALS',
          data: {
            apiKey,
            apiSecret,
          },
        },
        response => {
          if (response?.success) {
            console.log('API credentials updated in extension');
          }
        }
      );
    }
  }, [isExtensionInstalled, apiKey, apiSecret]);

  // This component doesn't render anything visible, it just handles extension communication
  return null;
};

export default Integration;
