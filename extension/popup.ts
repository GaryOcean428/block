/**
 * Poloniex Trading Platform Chrome Extension
 * TypeScript implementation with improved type safety
 */

// Type declarations for Chrome extensions API
// Using module declaration instead of namespace for modern TypeScript
interface ChromeTab {
  id?: number;
  url?: string;
}

interface ChromeQueryInfo {
  active?: boolean;
  currentWindow?: boolean;
  url?: string;
}

// Message types for type-safe communication
interface ExtensionMessage {
  type: string;
  [key: string]: unknown;
}

interface UpdateAppUrlMessage extends ExtensionMessage {
  type: 'updateAppUrl';
  url: string;
}

interface MessageResponse {
  received: boolean;
  [key: string]: unknown;
}

interface MessageSender {
  tab?: ChromeTab;
  frameId?: number;
  id?: string;
  url?: string;
  tlsChannelId?: string;
}

// Chrome API interfaces using modern module syntax
interface ChromeTabs {
  query(queryInfo: ChromeQueryInfo, callback: (tabs: ChromeTab[]) => void): void;
  update(tabId: number, updateProperties: { active: boolean }): Promise<ChromeTab>;
  create(createProperties: { url: string }): Promise<ChromeTab>;
}

interface ChromeRuntime {
  sendMessage(message: ExtensionMessage): Promise<MessageResponse>;
  onMessage: {
    addListener(
      callback: (
        message: ExtensionMessage,
        sender: MessageSender,
        sendResponse: (response: MessageResponse) => void
      ) => boolean | void
    ): void;
    removeListener(
      callback: (
        message: ExtensionMessage,
        sender: MessageSender,
        sendResponse: (response: MessageResponse) => void
      ) => boolean | void
    ): void;
  };
}

interface Chrome {
  tabs: ChromeTabs;
  runtime: ChromeRuntime;
}

// Make Chrome available globally
declare const chrome: Chrome;

interface ExtensionElements {
  pairSelect: HTMLSelectElement | null;
  buyBtn: HTMLButtonElement | null;
  sellBtn: HTMLButtonElement | null;
  messageInput: HTMLInputElement | null;
  sendBtn: HTMLButtonElement | null;
  chatMessages: HTMLDivElement | null;
  openAppBtn: HTMLButtonElement | null;
  settingsBtn: HTMLButtonElement | null;
}

interface Message {
  username: string;
  text: string;
  timestamp: number;
}

class PoloniexExtension {
  private readonly elements: ExtensionElements;
  // Make appURL not readonly so it can be updated in init()
  private appURL: string = 'http://localhost:5173';
  private readonly username: string;
  private readonly messages: Message[] = [];

  constructor() {
    // Initialize DOM elements
    this.elements = {
      pairSelect: document.getElementById('pair-select') as HTMLSelectElement,
      buyBtn: document.getElementById('buy-btn') as HTMLButtonElement,
      sellBtn: document.getElementById('sell-btn') as HTMLButtonElement,
      messageInput: document.getElementById('message-input') as HTMLInputElement,
      sendBtn: document.getElementById('send-btn') as HTMLButtonElement,
      chatMessages: document.getElementById('chat-messages') as HTMLDivElement,
      openAppBtn: document.getElementById('open-app-btn') as HTMLButtonElement,
      settingsBtn: document.getElementById('settings-btn') as HTMLButtonElement,
    };

    // Generate a random username
    this.username = 'user_' + Math.floor(Math.random() * 1000);

    // Initialize the extension
    this.init();
  }

  /**
   * Initialize the extension
   */
  private init(): void {
    // Set up event listeners
    this.initializeEventListeners();

    // Load some mock data for testing
    this.initializeMockData();

    // Set up message handling for background communication
    this.setupMessageHandling();
  }

  /**
   * Set up message handling with proper response handling
   */
  private setupMessageHandling(): void {
    // Add message listener with type-safe message handling
    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender: MessageSender, sendResponse) => {
        // Immediately respond to acknowledge receipt
        sendResponse({ received: true });

        // Process message asynchronously
        if (message.type === 'updateAppUrl') {
          const urlMessage = message as UpdateAppUrlMessage;
          this.appURL = urlMessage.url;
          this.showNotification(`App URL updated to ${urlMessage.url}`);
        }

        // Return false to indicate we won't respond asynchronously
        return false;
      }
    );
  }

  /**
   * Initialize all event listeners
   */
  private initializeEventListeners(): void {
    const { openAppBtn, settingsBtn, buyBtn, sellBtn, sendBtn, messageInput } = this.elements;

    // Open App button
    if (openAppBtn) {
      openAppBtn.addEventListener('click', () => this.handleOpenApp());
    }

    // Settings button
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.handleOpenSettings());
    }

    // Buy button
    if (buyBtn) {
      buyBtn.addEventListener('click', () => this.handleTrade('buy'));
    }

    // Sell button
    if (sellBtn) {
      sellBtn.addEventListener('click', () => this.handleTrade('sell'));
    }

    // Send message button
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Message input enter key
    if (messageInput) {
      messageInput.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    }
  }

  /**
   * Handler for opening the main app
   */
  private handleOpenApp(): void {
    const appUrl = this.appURL || 'http://localhost:5173'; // Explicitly use appURL to avoid unused warning

    try {
      // If we're on Poloniex, just focus the tab
      chrome.tabs.query({ url: '*://*.poloniex.com/*' }, (tabs: ChromeTab[]) => {
        // Type assertion for better type checking
        if (tabs.length > 0 && tabs[0]?.id !== undefined) {
          chrome.tabs
            .update(tabs[0].id, { active: true })
            .catch(err => console.error('Error updating tab:', err));
        } else {
          // Otherwise open the dashboard in a new tab
          chrome.tabs
            .create({ url: appUrl })
            .catch(err => console.error('Error creating tab:', err));
        }
      });
    } catch (error) {
      console.error('Error handling app open:', error);
      // Fallback - try to open directly
      window.open(appUrl, '_blank');
    }
  }

  /**
   * Handler for opening settings
   */
  private handleOpenSettings(): void {
    const popup = document.querySelector('.extension-container') as HTMLElement;

    if (popup) {
      // Save current content
      const originalContent = popup.innerHTML;

      // Load settings UI
      popup.innerHTML = `
        <div class="settings-container">
          <h2>Extension Settings</h2>
          <div class="form-group">
            <label for="api-key">API Key</label>
            <input type="text" id="api-key" placeholder="Enter API Key" />
          </div>
          <div class="form-group">
            <label for="api-secret">API Secret</label>
            <input type="password" id="api-secret" placeholder="Enter API Secret" />
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="enable-notifications" checked />
              Enable Notifications
            </label>
          </div>
          <div class="action-buttons">
            <button id="save-settings" class="primary-btn">Save</button>
            <button id="cancel-settings" class="secondary-btn">Cancel</button>
          </div>
        </div>
      `;

      // Add event listeners for settings buttons
      const saveBtn = document.getElementById('save-settings');
      const cancelBtn = document.getElementById('cancel-settings');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          // Save settings logic would go here
          this.showNotification('Settings saved successfully');
          popup.innerHTML = originalContent;
          this.initializeEventListeners(); // Re-initialize event listeners
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          popup.innerHTML = originalContent;
          this.initializeEventListeners(); // Re-initialize event listeners
        });
      }
    }
  }

  /**
   * Handler for trade actions
   */
  private handleTrade(action: 'buy' | 'sell'): void {
    const { pairSelect } = this.elements;
    const pair = pairSelect ? pairSelect.value : 'BTC-USDT';

    // In a real scenario, this would interact with the trading API
    // For now, just show a notification
    this.showNotification(`${action.toUpperCase()} order placed for ${pair}`);
  }

  /**
   * Send a chat message
   */
  private sendMessage(): void {
    const { messageInput, chatMessages } = this.elements;

    if (!messageInput || !chatMessages) return;

    const message = messageInput.value.trim();
    if (message) {
      this.addMessageToChat(this.username, message);
      messageInput.value = '';
    }
  }

  /**
   * Add a message to the chat UI
   */
  private addMessageToChat(username: string, text: string): void {
    const { chatMessages } = this.elements;

    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `
      <span class="username">${username}:</span>
      <span class="text">${text}</span>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Store the message
    this.messages.push({
      username,
      text,
      timestamp: Date.now(),
    });
  }

  /**
   * Show a notification to the user
   */
  private showNotification(message: string): void {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.position = 'absolute';
    notification.style.bottom = '10px';
    notification.style.right = '10px';
    notification.style.backgroundColor = '#4caf50';
    notification.style.color = 'white';
    notification.style.padding = '8px 12px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Initialize mock data for testing
   */
  private initializeMockData(): void {
    const { chatMessages } = this.elements;

    // Only add if chat exists
    if (chatMessages) {
      setTimeout(() => {
        this.addMessageToChat('system', 'Welcome to the trading chat!');
      }, 1000);

      setTimeout(() => {
        this.addMessageToChat('market_bot', 'BTC just broke $52,000!');
      }, 3000);
    }
  }
}

// Initialize the extension when the DOM is loaded using self-executing function
document.addEventListener('DOMContentLoaded', () => {
  // Using immediately invoked instance instead of storing in a variable
  (() => new PoloniexExtension())();
});
