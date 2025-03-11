// Content script for Poloniex pages
console.log('Poloniex content script loaded');

// Initialize variables
let isExtractingData = false;
let accountData = {};
let openPositions = [];
let orderHistory = [];
let interval = null;
let balanceHistory = [];
let lastBalanceUpdate = Date.now();

// Function to start data extraction
function startDataExtraction() {
  console.log('Starting Poloniex data extraction');

  if (interval) {
    clearInterval(interval);
  }

  // Extract data every 5 seconds
  interval = setInterval(extractPoloniexData, 5000);
  isExtractingData = true;

  // Also extract data immediately
  extractPoloniexData();
}

// Function to stop data extraction
function stopDataExtraction() {
  console.log('Stopping Poloniex data extraction');

  if (interval) {
    clearInterval(interval);
    interval = null;
  }

  isExtractingData = false;
}

// Function to extract data from Poloniex
function extractPoloniexData() {
  try {
    // Extract account data
    const accountDataElement = document.querySelector('.account-summary');
    if (accountDataElement) {
      accountData = extractAccountInfo();

      // Track balance history
      if (Date.now() - lastBalanceUpdate > 60000) {
        // Once per minute
        if (accountData.totalBalance) {
          balanceHistory.push({
            timestamp: Date.now(),
            balance: accountData.totalBalance,
          });

          // Keep only last 24 hours of data
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          balanceHistory = balanceHistory.filter(entry => entry.timestamp >= oneDayAgo);

          lastBalanceUpdate = Date.now();
        }
      }
    }

    // Extract positions data
    const positionsElement = document.querySelector('.positions-table');
    if (positionsElement) {
      openPositions = extractPositionsInfo();
    }

    // Extract order history
    const orderHistoryElement = document.querySelector('.order-history-table');
    if (orderHistoryElement) {
      orderHistory = extractOrderHistory();
    }

    // Send data to background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_POLONIEX_DATA',
      data: {
        accountData,
        positions: openPositions,
        orders: orderHistory,
        balanceHistory,
        timestamp: Date.now(),
      },
    });

    // Also add a visible indicator that data is being extracted
    showExtractorStatus();
  } catch (error) {
    console.error('Error extracting Poloniex data:', error);
  }
}

// Function to extract account information
function extractAccountInfo() {
  try {
    // This is a simplistic implementation - in a real extension
    // you would need to identify and target the exact elements on the Poloniex page
    // that contain the account information

    // Look for balance elements
    const balanceElements = document.querySelectorAll('.account-balance, .balance-display');
    const futuresBalanceElements = document.querySelectorAll('.futures-balance, .futures-equity');
    let totalBalance = null;
    let availableBalance = null;

    balanceElements.forEach(element => {
      const label = element.querySelector('.label');
      const value = element.querySelector('.value');

      if (label && value) {
        const labelText = label.textContent.trim().toLowerCase();
        const valueText = value.textContent.trim().replace(/[^0-9.]/g, '');

        if (labelText.includes('total') || labelText.includes('equity')) {
          totalBalance = parseFloat(valueText);
        } else if (labelText.includes('available')) {
          availableBalance = parseFloat(valueText);
        }
      }
    });

    // Look for futures-specific balance elements
    futuresBalanceElements.forEach(element => {
      const label = element.querySelector('.label');
      const value = element.querySelector('.value');

      if (label && value) {
        const labelText = label.textContent.trim().toLowerCase();
        const valueText = value.textContent.trim().replace(/[^0-9.]/g, '');

        if (labelText.includes('futures') || labelText.includes('equity')) {
          totalBalance = parseFloat(valueText);
        }
      }
    });

    // Look for PNL elements
    const pnlElements = document.querySelectorAll('.pnl-display, .profit-loss');
    let dailyPnl = null;

    pnlElements.forEach(element => {
      const text = element.textContent.trim();
      if (text.includes('Day') || text.includes('Today')) {
        const pnlValue = text.replace(/[^0-9.-]/g, '');
        dailyPnl = parseFloat(pnlValue);
      }
    });

    // Look for margin ratio elements
    const marginElements = document.querySelectorAll('.margin-ratio, .leverage-display');
    let marginRatio = null;
    let leverage = null;

    marginElements.forEach(element => {
      const text = element.textContent.trim().toLowerCase();
      if (text.includes('margin')) {
        const marginValue = text.replace(/[^0-9.]/g, '');
        marginRatio = parseFloat(marginValue);
      } else if (text.includes('leverage')) {
        const leverageValue = text.replace(/[^0-9.]/g, '');
        leverage = parseFloat(leverageValue);
      }
    });

    return {
      totalBalance,
      availableBalance,
      dailyPnl,
      marginRatio,
      leverage,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error extracting account info:', error);
    return {};
  }
}

// Function to extract positions information
function extractPositionsInfo() {
  try {
    const positions = [];
    const positionRows = document.querySelectorAll('.positions-row, .position-item');

    positionRows.forEach(row => {
      // Extract position data from each row
      // This is a simplified example - adapt to match Poloniex's actual DOM structure

      const symbol = row.querySelector('.symbol')?.textContent.trim();
      const size = row.querySelector('.size')?.textContent.trim();
      const entryPrice = row.querySelector('.entry-price')?.textContent.trim();
      const markPrice = row.querySelector('.mark-price')?.textContent.trim();
      const pnl = row.querySelector('.pnl')?.textContent.trim();
      const leverage = row.querySelector('.leverage')?.textContent.trim();
      const liquidationPrice = row.querySelector('.liquidation-price')?.textContent.trim();
      const side = row.querySelector('.side')?.textContent.trim()?.toLowerCase();

      if (symbol) {
        positions.push({
          symbol,
          size: parseFloat(size?.replace(/[^0-9.-]/g, '') || '0'),
          entryPrice: parseFloat(entryPrice?.replace(/[^0-9.-]/g, '') || '0'),
          markPrice: parseFloat(markPrice?.replace(/[^0-9.-]/g, '') || '0'),
          pnl: parseFloat(pnl?.replace(/[^0-9.-]/g, '') || '0'),
          leverage: parseFloat(leverage?.replace(/[^0-9.-]/g, '') || '1'),
          liquidationPrice: parseFloat(liquidationPrice?.replace(/[^0-9.-]/g, '') || '0'),
          side: side?.includes('long') ? 'long' : 'short',
          timestamp: Date.now(),
        });
      }
    });

    return positions;
  } catch (error) {
    console.error('Error extracting positions info:', error);
    return [];
  }
}

// Function to extract order history
function extractOrderHistory() {
  try {
    const orders = [];
    const orderRows = document.querySelectorAll('.order-row, .order-item');

    orderRows.forEach(row => {
      // Extract order data from each row
      // This is a simplified example - adapt to match Poloniex's actual DOM structure

      const orderId = row.querySelector('.order-id')?.textContent.trim();
      const symbol = row.querySelector('.symbol')?.textContent.trim();
      const type = row.querySelector('.type')?.textContent.trim();
      const side = row.querySelector('.side')?.textContent.trim();
      const price = row.querySelector('.price')?.textContent.trim();
      const amount = row.querySelector('.amount')?.textContent.trim();
      const status = row.querySelector('.status')?.textContent.trim();
      const time = row.querySelector('.time')?.textContent.trim();

      if (orderId && symbol) {
        orders.push({
          orderId,
          symbol,
          type: type?.toLowerCase() || '',
          side: side?.toLowerCase() || '',
          price: parseFloat(price?.replace(/[^0-9.-]/g, '') || '0'),
          amount: parseFloat(amount?.replace(/[^0-9.-]/g, '') || '0'),
          status: status?.toLowerCase() || '',
          timestamp: Date.now(),
          orderTime: time || new Date().toISOString(),
        });
      }
    });

    return orders;
  } catch (error) {
    console.error('Error extracting order history:', error);
    return [];
  }
}

// Function to show the status of the data extractor
function showExtractorStatus() {
  let statusBar = document.getElementById('poloniex-extension-status');

  if (!statusBar) {
    statusBar = document.createElement('div');
    statusBar.id = 'poloniex-extension-status';
    statusBar.style.position = 'fixed';
    statusBar.style.bottom = '10px';
    statusBar.style.right = '10px';
    statusBar.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    statusBar.style.color = 'white';
    statusBar.style.padding = '5px 10px';
    statusBar.style.borderRadius = '3px';
    statusBar.style.fontSize = '12px';
    statusBar.style.zIndex = '9999';
    document.body.appendChild(statusBar);
  }

  // Create balance change indicator
  let balanceChangeText = '';
  if (balanceHistory.length >= 2) {
    const latestBalance = balanceHistory[balanceHistory.length - 1].balance;
    const earliestBalance = balanceHistory[0].balance;
    const change = latestBalance - earliestBalance;
    const changePercent = (change / earliestBalance) * 100;

    balanceChangeText = `
      <div>24h Change: <span style="color: ${change >= 0 ? '#10b981' : '#ef4444'}">
        ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)
      </span></div>
    `;
  }

  // Create positions summary
  let positionsText = '';
  if (openPositions.length > 0) {
    positionsText = `<div>Open Positions: ${openPositions.length}</div>`;
  }

  statusBar.innerHTML = `
    <div>Trading Extension Active</div>
    <div>Data synced: ${new Date().toLocaleTimeString()}</div>
    ${accountData.totalBalance ? `<div>Balance: ${accountData.totalBalance.toFixed(2)}</div>` : ''}
    ${balanceChangeText}
    ${positionsText}
  `;
}

// Function to execute a trade directly from extension
function executeTrade(tradeData) {
  try {
    console.log('Executing trade on Poloniex UI:', tradeData);

    // Find and interact with the trading form on Poloniex
    // This is a simplified example - adapt to match Poloniex's actual DOM structure

    // Select pair in dropdown
    const pairSelector = document.querySelector('select.pair-select, .symbol-selector');
    if (pairSelector) {
      // Convert from BTC-USDT format to Poloniex format
      const poloniexPair = tradeData.pair.replace('-', '_');

      // Try to find and select the option
      const options = Array.from(pairSelector.options);
      const option = options.find(
        opt => opt.value === poloniexPair || opt.textContent.includes(poloniexPair)
      );

      if (option) {
        option.selected = true;
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        pairSelector.dispatchEvent(event);
      }
    }

    // Select trade type (limit/market)
    const typeSelector = document.querySelector('select.order-type, .type-selector');
    if (typeSelector) {
      const options = Array.from(typeSelector.options);
      const option = options.find(opt => opt.value.toLowerCase() === tradeData.type.toLowerCase());

      if (option) {
        option.selected = true;
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        typeSelector.dispatchEvent(event);
      }
    }

    // Fill in amount
    const amountInput = document.querySelector('input.amount-input, .quantity-input');
    if (amountInput) {
      amountInput.value = tradeData.amount;
      // Trigger input event
      const event = new Event('input', { bubbles: true });
      amountInput.dispatchEvent(event);
    }

    // Fill in price for limit orders
    if (tradeData.type.toLowerCase() === 'limit' && tradeData.price) {
      const priceInput = document.querySelector('input.price-input, .limit-price-input');
      if (priceInput) {
        priceInput.value = tradeData.price;
        // Trigger input event
        const event = new Event('input', { bubbles: true });
        priceInput.dispatchEvent(event);
      }
    }

    // Set stop loss if provided
    if (tradeData.stopLossPercent) {
      const stopLossInput = document.querySelector('input.stop-loss-input, .stop-loss');
      if (stopLossInput) {
        const stopPrice =
          tradeData.side.toLowerCase() === 'buy'
            ? tradeData.price * (1 - tradeData.stopLossPercent / 100)
            : tradeData.price * (1 + tradeData.stopLossPercent / 100);

        stopLossInput.value = stopPrice.toFixed(2);
        // Trigger input event
        const event = new Event('input', { bubbles: true });
        stopLossInput.dispatchEvent(event);
      }
    }

    // Set take profit if provided
    if (tradeData.takeProfitPercent) {
      const takeProfitInput = document.querySelector('input.take-profit-input, .take-profit');
      if (takeProfitInput) {
        const takePrice =
          tradeData.side.toLowerCase() === 'buy'
            ? tradeData.price * (1 + tradeData.takeProfitPercent / 100)
            : tradeData.price * (1 - tradeData.takeProfitPercent / 100);

        takeProfitInput.value = takePrice.toFixed(2);
        // Trigger input event
        const event = new Event('input', { bubbles: true });
        takeProfitInput.dispatchEvent(event);
      }
    }

    // Click buy or sell button
    let actionButton;
    if (tradeData.side.toLowerCase() === 'buy') {
      actionButton = document.querySelector('button.buy-button, .buy-action');
    } else {
      actionButton = document.querySelector('button.sell-button, .sell-action');
    }

    if (actionButton) {
      // Click the button
      actionButton.click();

      // Check for confirmation dialog
      setTimeout(() => {
        const confirmButton = document.querySelector('.confirm-button, .modal-confirm');
        if (confirmButton) {
          confirmButton.click();
        }
      }, 500);

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error executing trade on Poloniex UI:', error);
    return false;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_DATA_EXTRACTION') {
    startDataExtraction();
    sendResponse({ success: true });
  } else if (request.type === 'STOP_DATA_EXTRACTION') {
    stopDataExtraction();
    sendResponse({ success: true });
  } else if (request.type === 'GET_POLONIEX_DATA') {
    sendResponse({
      success: true,
      data: {
        accountData,
        positions: openPositions,
        orders: orderHistory,
        balanceHistory,
      },
    });
  } else if (request.type === 'EXECUTE_TRADE') {
    const success = executeTrade(request.data);
    sendResponse({ success });
  }
  return true;
});

// Start data extraction when the script loads
startDataExtraction();

// Inject trading buttons if needed
function injectTradingButtons() {
  try {
    // Wait for the trading interface to be fully loaded
    const checkForTradingInterface = setInterval(() => {
      const tradingForm = document.querySelector('.trading-form, .order-form');
      if (tradingForm) {
        clearInterval(checkForTradingInterface);

        // Create a container for our buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'extension-buttons';
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';

        // Create quick trade buttons
        const quickBuyButton = document.createElement('button');
        quickBuyButton.innerText = 'Quick Buy';
        quickBuyButton.className = 'quick-buy-button';
        quickBuyButton.style.backgroundColor = '#10b981';
        quickBuyButton.style.color = 'white';
        quickBuyButton.style.border = 'none';
        quickBuyButton.style.padding = '8px 16px';
        quickBuyButton.style.borderRadius = '4px';
        quickBuyButton.style.cursor = 'pointer';
        quickBuyButton.style.flex = '1';

        const quickSellButton = document.createElement('button');
        quickSellButton.innerText = 'Quick Sell';
        quickSellButton.className = 'quick-sell-button';
        quickSellButton.style.backgroundColor = '#ef4444';
        quickSellButton.style.color = 'white';
        quickSellButton.style.border = 'none';
        quickSellButton.style.padding = '8px 16px';
        quickSellButton.style.borderRadius = '4px';
        quickSellButton.style.cursor = 'pointer';
        quickSellButton.style.flex = '1';

        // Add buttons to container
        buttonContainer.appendChild(quickBuyButton);
        buttonContainer.appendChild(quickSellButton);

        // Add container to trading form
        tradingForm.appendChild(buttonContainer);

        // Add click handlers
        quickBuyButton.addEventListener('click', () => {
          // Get current pair and price
          const pairElement = document.querySelector('.current-pair, .symbol-display');
          const priceElement = document.querySelector('.current-price, .price-display');

          if (pairElement && priceElement) {
            const pair = pairElement.textContent.trim();
            const price = parseFloat(priceElement.textContent.replace(/[^0-9.-]/g, ''));

            // Execute a market buy for a small amount
            executeTrade({
              pair,
              side: 'buy',
              type: 'market',
              amount: 0.01, // Small default amount
              price,
            });
          }
        });

        quickSellButton.addEventListener('click', () => {
          // Get current pair and price
          const pairElement = document.querySelector('.current-pair, .symbol-display');
          const priceElement = document.querySelector('.current-price, .price-display');

          if (pairElement && priceElement) {
            const pair = pairElement.textContent.trim();
            const price = parseFloat(priceElement.textContent.replace(/[^0-9.-]/g, ''));

            // Execute a market sell for a small amount
            executeTrade({
              pair,
              side: 'sell',
              type: 'market',
              amount: 0.01, // Small default amount
              price,
            });
          }
        });
      }
    }, 1000);
  } catch (error) {
    console.error('Error injecting trading buttons:', error);
  }
}

// Wait for page to be fully loaded before injecting UI controls
window.addEventListener('load', () => {
  injectTradingButtons();
});
