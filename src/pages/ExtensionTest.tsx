import React, { useState } from 'react';
import {
  isChromeExtensionApiAvailable,
  safelySendExtensionMessage,
  isExtensionAvailable,
  EXTENSION_ID,
} from '../utils/extensionHelper';

/**
 * A safe test page for Chrome extension functionality
 * This component implements comprehensive error handling and timeout protection
 */
const ExtensionTest: React.FC = () => {
  const [extensionStatus, setExtensionStatus] = useState<string>('Not checked');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [chromeDetails, setChromeDetails] = useState<string>('');
  const [testResults, setTestResults] = useState<Array<{ name: string; result: string }>>([]);

  // Safely check if extension is available
  const checkExtensionAvailability = async () => {
    setIsChecking(true);
    setError('');
    setTestResults([]);

    try {
      // Check Chrome API availability first
      const results = [];

      // Test 1: Check if Chrome object exists
      const chromeExists = typeof window.chrome !== 'undefined';
      results.push({
        name: 'Chrome object exists',
        result: chromeExists ? 'PASS' : 'FAIL',
      });

      // Test 2: Check if runtime exists
      const runtimeExists = chromeExists && !!window.chrome.runtime;
      results.push({
        name: 'Chrome runtime exists',
        result: runtimeExists ? 'PASS' : 'FAIL',
      });

      // Test 3: Check if sendMessage exists
      const sendMessageExists = runtimeExists && !!window.chrome.runtime.sendMessage;
      results.push({
        name: 'sendMessage function exists',
        result: sendMessageExists ? 'PASS' : 'FAIL',
      });

      // Set Chrome details
      setChromeDetails(`
        Chrome API available: ${chromeExists ? 'Yes' : 'No'}
        Runtime API available: ${runtimeExists ? 'Yes' : 'No'}
        sendMessage available: ${sendMessageExists ? 'Yes' : 'No'}
      `);

      // Test 4: Check if our helper functions work
      const apiAvailable = isChromeExtensionApiAvailable();
      results.push({
        name: 'isChromeExtensionApiAvailable()',
        result: apiAvailable ? 'PASS' : 'FAIL',
      });

      // Test 5: Check if extension is available
      try {
        const available = await isExtensionAvailable();
        setExtensionStatus(available ? 'Extension is available' : 'Extension not detected');
        results.push({
          name: 'Extension available check',
          result: available ? 'PASS' : 'FAIL',
        });
      } catch (err) {
        setExtensionStatus('Error checking extension');
        setError(err instanceof Error ? err.message : 'Unknown error checking extension');
        results.push({
          name: 'Extension available check',
          result: 'ERROR',
        });
      }

      setTestResults(results);
    } catch (err) {
      setExtensionStatus('Error performing tests');
      setError(err instanceof Error ? err.message : 'Unknown error during tests');
    } finally {
      setIsChecking(false);
    }
  };

  // Try to send a message to the extension directly (with timeouts and error handling)
  const trySendingMessage = async () => {
    setIsChecking(true);
    setError('');

    try {
      if (!isChromeExtensionApiAvailable()) {
        setError('Chrome extension API not available');
        return;
      }

      try {
        const response = await safelySendExtensionMessage({
          type: 'PING',
          data: { timestamp: Date.now() },
        });

        setTestResults(prev => [
          ...prev,
          {
            name: 'Send test message',
            result: 'SUCCESS: ' + JSON.stringify(response),
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error sending message');
        setTestResults(prev => [
          ...prev,
          {
            name: 'Send test message',
            result: 'FAILED',
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Extension Test Page</h1>
      <p className="mb-4 text-gray-600">
        Use this page to safely test Chrome extension integration without crashing the browser.
      </p>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Extension Status</h2>
        <p>
          <strong>Current Status:</strong> {extensionStatus}
        </p>

        {error && (
          <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-md">
            <strong>Error:</strong> {error}
          </div>
        )}

        {chromeDetails && (
          <div className="mt-2 p-3 bg-blue-50 text-blue-700 rounded-md">
            <pre className="whitespace-pre-line">{chromeDetails}</pre>
          </div>
        )}

        <div className="mt-4 flex space-x-4">
          <button
            onClick={checkExtensionAvailability}
            disabled={isChecking}
            className={`px-4 py-2 rounded-md ${
              isChecking
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isChecking ? 'Checking...' : 'Check Extension'}
          </button>

          <button
            onClick={trySendingMessage}
            disabled={isChecking}
            className={`px-4 py-2 rounded-md ${
              isChecking
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Test Message
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Test Results</h2>
        {testResults.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {testResults.map((test, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {test.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          test.result.includes('PASS') || test.result.includes('SUCCESS')
                            ? 'bg-green-100 text-green-800'
                            : test.result.includes('FAIL') || test.result.includes('FAILED')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {test.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic">No tests run yet</p>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Technical Info</h2>
        <p className="text-sm text-gray-600">
          <strong>Extension ID:</strong> {EXTENSION_ID}
          <br />
          <strong>Chrome detection:</strong> Uses multiple layers of error handling and timeout
          protection
          <br />
          <strong>API Access:</strong> All extension communication happens through safe helpers with
          timeout protection
        </p>
      </div>
    </div>
  );
};

export default ExtensionTest;
