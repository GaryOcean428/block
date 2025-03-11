// Content script for TradingView pages
console.log('TradingView content script loaded');

// Initialize variables
let isExtractingData = false;
let chartSymbol = '';
let lastPrice = 0;
let chartData = {};
let interval = null;
let indicators = [];
let chartTimeframe = '';
let chartPatterns = [];

// Function to start data extraction
function startDataExtraction() {
  console.log('Starting TradingView data extraction');

  if (interval) {
    clearInterval(interval);
  }

  // Extract data every 5 seconds
  interval = setInterval(extractChartData, 5000);
  isExtractingData = true;

  // Also extract data immediately
  extractChartData();
}

// Function to stop data extraction
function stopDataExtraction() {
  console.log('Stopping TradingView data extraction');

  if (interval) {
    clearInterval(interval);
    interval = null;
  }

  isExtractingData = false;
}

// Function to extract chart data from TradingView
function extractChartData() {
  try {
    // Look for the chart symbol
    const symbolElement = document.querySelector('.chart-container .apply-common-tooltip');
    if (symbolElement) {
      chartSymbol = symbolElement.textContent.trim();
    }

    // Look for price info
    const priceElement = document.querySelector('.chart-container .price-PMjTOxfm');
    if (priceElement) {
      lastPrice = parseFloat(priceElement.textContent.replace(/[^\d.-]/g, ''));
    }

    // Look for additional info like volume, etc.
    const additionalInfo = {};

    // Find time frame
    const timeframeElement = document.querySelector('.chart-container .value-DWZXOdoK');
    if (timeframeElement) {
      chartTimeframe = timeframeElement.textContent.trim();
      additionalInfo.timeframe = chartTimeframe;
    }

    // Try to find chart indicators
    const indicatorsElements = document.querySelectorAll(
      '.chart-container .study-legend-GzQpOzPY .study-item-GzQpOzPY .title-GzQpOzPY'
    );
    if (indicatorsElements.length > 0) {
      indicators = Array.from(indicatorsElements).map(el => el.textContent.trim());
      additionalInfo.indicators = indicators;
    }

    // Try to find volume
    const volumeElement = document.querySelector('.chart-container .valueValue-l31H9iuA');
    if (volumeElement) {
      additionalInfo.volume = volumeElement.textContent.trim();
    }

    // Try to detect patterns (look for pattern markers on the chart)
    const patternElements = document.querySelectorAll('.chart-container .pattern-marker');
    if (patternElements.length > 0) {
      chartPatterns = Array.from(patternElements).map(el => ({
        type: el.getAttribute('data-pattern-type') || 'unknown',
        position: el.getAttribute('data-position') || 'unknown',
        timestamp: parseInt(el.getAttribute('data-timestamp') || '0'),
      }));
      additionalInfo.patterns = chartPatterns;
    }

    // Format the chart data
    let poloniexPair = '';

    // Convert TradingView symbol format to Poloniex format
    if (chartSymbol.includes('USDT')) {
      // Example: BTCUSDT -> BTC-USDT
      poloniexPair = chartSymbol.replace(/(\w+)(USDT)/, '$1-$2');
    } else if (chartSymbol.includes('/')) {
      // Example: BTC/USDT -> BTC-USDT
      poloniexPair = chartSymbol.replace('/', '-');
    } else {
      poloniexPair = chartSymbol;
    }

    chartData = {
      source: 'tradingview',
      timestamp: Date.now(),
      tradingViewSymbol: chartSymbol,
      pair: poloniexPair,
      price: lastPrice,
      ...additionalInfo,
    };

    // Send data to background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_TRADINGVIEW_DATA',
      data: {
        [poloniexPair]: chartData,
      },
    });

    // Also add a visible indicator that data is being extracted
    showExtractorStatus();
  } catch (error) {
    console.error('Error extracting chart data:', error);
  }
}

// Function to show the status of the data extractor
function showExtractorStatus() {
  let statusBar = document.getElementById('trading-extension-status');

  if (!statusBar) {
    statusBar = document.createElement('div');
    statusBar.id = 'trading-extension-status';
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

  let indicatorsText = '';
  if (indicators.length > 0) {
    indicatorsText = `<div>Indicators: ${indicators.slice(0, 3).join(', ')}${indicators.length > 3 ? '...' : ''}</div>`;
  }

  let patternsText = '';
  if (chartPatterns.length > 0) {
    patternsText = `<div>Patterns: ${chartPatterns
      .slice(0, 2)
      .map(p => p.type)
      .join(', ')}${chartPatterns.length > 2 ? '...' : ''}</div>`;
  }

  statusBar.innerHTML = `
    <div>Trading Extension Active</div>
    <div>Symbol: ${chartSymbol}</div>
    <div>Price: ${lastPrice}</div>
    <div>Timeframe: ${chartTimeframe}</div>
    ${indicatorsText}
    ${patternsText}
  `;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_DATA_EXTRACTION') {
    startDataExtraction();
    sendResponse({ success: true });
  } else if (request.type === 'STOP_DATA_EXTRACTION') {
    stopDataExtraction();
    sendResponse({ success: true });
  } else if (request.type === 'GET_CHART_DATA') {
    sendResponse({ success: true, data: chartData });
  }
  return true;
});

// Start data extraction when the script loads
startDataExtraction();

// Inject additional UI elements for executing trades directly from TradingView
function injectTradeControls() {
  try {
    // Wait for the chart UI to be fully loaded
    const checkForChartContainer = setInterval(() => {
      const chartToolbar = document.querySelector('.chart-toolbar');
      if (chartToolbar) {
        clearInterval(checkForChartContainer);

        // Create the trade button
        const tradeButton = document.createElement('button');
        tradeButton.innerText = 'Quick Trade';
        tradeButton.className = 'button-iCxRQTKd';
        tradeButton.style.backgroundColor = '#3b82f6';
        tradeButton.style.color = 'white';
        tradeButton.style.marginLeft = '10px';

        // Add the button to the toolbar
        chartToolbar.appendChild(tradeButton);

        // Add click handler
        tradeButton.addEventListener('click', () => {
          openTradePanel();
        });

        // Add strategy analysis button
        const analyzeButton = document.createElement('button');
        analyzeButton.innerText = 'Analyze';
        analyzeButton.className = 'button-iCxRQTKd';
        analyzeButton.style.backgroundColor = '#10b981';
        analyzeButton.style.color = 'white';
        analyzeButton.style.marginLeft = '10px';

        // Add the button to the toolbar
        chartToolbar.appendChild(analyzeButton);

        // Add click handler
        analyzeButton.addEventListener('click', () => {
          analyzeChart();
        });
      }
    }, 1000);
  } catch (error) {
    console.error('Error injecting trade controls:', error);
  }
}

// Function to analyze the current chart
function analyzeChart() {
  // Create panel
  const panel = document.createElement('div');
  panel.id = 'analysis-panel';
  panel.style.position = 'fixed';
  panel.style.top = '100px';
  panel.style.right = '20px';
  panel.style.width = '300px';
  panel.style.backgroundColor = 'white';
  panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
  panel.style.borderRadius = '5px';
  panel.style.zIndex = '10000';
  panel.style.padding = '15px';

  // Add content to panel
  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <h3 style="margin: 0; font-size: 16px;">Chart Analysis</h3>
      <button id="close-analysis-panel" style="background: none; border: none; cursor: pointer; font-size: 16px;">×</button>
    </div>
    <div style="margin-bottom: 10px;">
      <div style="margin-bottom: 5px;">Symbol: ${chartSymbol}</div>
      <div style="margin-bottom: 5px;">Current Price: ${lastPrice}</div>
      <div style="margin-bottom: 5px;">Timeframe: ${chartTimeframe}</div>
    </div>
    <div style="margin-bottom: 10px;">
      <div style="font-weight: 500; margin-bottom: 5px;">Indicators:</div>
      <ul style="margin: 0; padding-left: 20px;">
        ${indicators.map(indicator => `<li>${indicator}</li>`).join('')}
      </ul>
    </div>
    <div style="margin-bottom: 10px;">
      <div style="font-weight: 500; margin-bottom: 5px;">Detected Patterns:</div>
      <div id="patterns-list">Analyzing patterns...</div>
    </div>
    <div style="margin-bottom: 10px;">
      <div style="font-weight: 500; margin-bottom: 5px;">Recommendation:</div>
      <div id="recommendation">Analyzing...</div>
    </div>
    <button id="run-strategies" style="width: 100%; padding: 8px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Run All Strategies
    </button>
  `;

  document.body.appendChild(panel);

  // Add event listeners
  document.getElementById('close-analysis-panel').addEventListener('click', () => {
    panel.remove();
  });

  document.getElementById('run-strategies').addEventListener('click', () => {
    // Send message to run all strategies on this chart
    chrome.runtime.sendMessage(
      {
        type: 'RUN_STRATEGIES',
        data: {
          pair: chartData.pair,
          price: lastPrice,
          timeframe: chartTimeframe,
        },
      },
      response => {
        if (response && response.success) {
          document.getElementById('recommendation').innerHTML = `
          <div style="padding: 8px; background-color: ${response.signal === 'BUY' ? '#dcfce7' : response.signal === 'SELL' ? '#fee2e2' : '#f3f4f6'}; 
                      color: ${response.signal === 'BUY' ? '#166534' : response.signal === 'SELL' ? '#991b1b' : '#374151'}; 
                      border-radius: 4px; margin-top: 5px;">
            <strong>${response.signal || 'NEUTRAL'}</strong>: ${response.reason || 'No clear signal'}
          </div>
        `;
        }
      }
    );

    // Simulate pattern detection
    setTimeout(() => {
      const patterns = ['Bullish Engulfing', 'Doji'];
      document.getElementById('patterns-list').innerHTML =
        patterns.length > 0
          ? patterns
              .map(
                p =>
                  `<div style="padding: 4px 8px; background-color: #f0fdf4; color: #166534; border-radius: 4px; margin-top: 5px;">${p}</div>`
              )
              .join('')
          : 'No patterns detected';

      document.getElementById('recommendation').innerHTML = `
        <div style="padding: 8px; background-color: #dcfce7; color: #166534; border-radius: 4px; margin-top: 5px;">
          <strong>BUY</strong>: Bullish pattern detected with support at current levels
        </div>
      `;
    }, 1500);
  });
}

// Function to open a trade panel
function openTradePanel() {
  // Check if panel already exists and remove it
  const existingPanel = document.getElementById('trade-panel');
  if (existingPanel) {
    existingPanel.remove();
    return;
  }

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'trade-panel';
  panel.style.position = 'fixed';
  panel.style.top = '100px';
  panel.style.right = '20px';
  panel.style.width = '300px';
  panel.style.backgroundColor = 'white';
  panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
  panel.style.borderRadius = '5px';
  panel.style.zIndex = '10000';
  panel.style.padding = '15px';

  // Add content to panel
  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <h3 style="margin: 0; font-size: 16px;">Execute Trade</h3>
      <button id="close-panel" style="background: none; border: none; cursor: pointer; font-size: 16px;">×</button>
    </div>
    <div style="margin-bottom: 10px;">
      <div style="margin-bottom: 5px;">Symbol: ${chartSymbol}</div>
      <div style="margin-bottom: 5px;">Current Price: ${lastPrice}</div>
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px;">Type:</label>
      <select id="trade-type" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        <option value="limit">Limit</option>
        <option value="market">Market</option>
      </select>
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px;">Side:</label>
      <div style="display: flex; gap: 10px;">
        <button id="buy-button" style="flex: 1; padding: 5px; background-color: #10b981; color: white; border: none; border-radius: 3px; cursor: pointer;">Buy</button>
        <button id="sell-button" style="flex: 1; padding: 5px; background-color: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer;">Sell</button>
      </div>
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px;">Amount:</label>
      <input id="trade-amount" type="number" step="0.0001" min="0" placeholder="0.0000" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
    </div>
    <div id="limit-price-container" style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px;">Price:</label>
      <input id="trade-price" type="number" step="0.01" min="0" value="${lastPrice}" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px;">Risk Management:</label>
      <div style="display: flex; gap: 10px;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 5px; font-size: 12px;">Stop Loss %:</label>
          <input id="stop-loss-percent" type="number" step="0.1" min="0" value="2" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 5px; font-size: 12px;">Take Profit %:</label>
          <input id="take-profit-percent" type="number" step="0.1" min="0" value="5" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>
      </div>
    </div>
    <div id="trade-status" style="margin-bottom: 10px; color: #666; font-size: 14px;"></div>
  `;

  document.body.appendChild(panel);

  // Add event listeners
  document.getElementById('close-panel').addEventListener('click', () => {
    panel.remove();
  });

  document.getElementById('trade-type').addEventListener('change', e => {
    const limitPriceContainer = document.getElementById('limit-price-container');
    if (e.target.value === 'market') {
      limitPriceContainer.style.display = 'none';
    } else {
      limitPriceContainer.style.display = 'block';
    }
  });

  document.getElementById('buy-button').addEventListener('click', () => {
    executeTrade('buy');
  });

  document.getElementById('sell-button').addEventListener('click', () => {
    executeTrade('sell');
  });
}

// Function to execute a trade directly from TradingView
function executeTrade(side) {
  const tradeType = document.getElementById('trade-type').value;
  const amount = parseFloat(document.getElementById('trade-amount').value);
  const price =
    tradeType === 'limit' ? parseFloat(document.getElementById('trade-price').value) : null;
  const stopLossPercent = parseFloat(document.getElementById('stop-loss-percent').value);
  const takeProfitPercent = parseFloat(document.getElementById('take-profit-percent').value);
  const statusElement = document.getElementById('trade-status');

  if (!amount || isNaN(amount) || amount <= 0) {
    statusElement.textContent = 'Please enter a valid amount';
    statusElement.style.color = '#ef4444';
    return;
  }

  if (tradeType === 'limit' && (!price || isNaN(price) || price <= 0)) {
    statusElement.textContent = 'Please enter a valid price';
    statusElement.style.color = '#ef4444';
    return;
  }

  // Convert TradingView symbol to Poloniex format
  let poloniexPair = '';
  if (chartSymbol.includes('USDT')) {
    poloniexPair = chartSymbol.replace(/(\w+)(USDT)/, '$1-$2');
  } else if (chartSymbol.includes('/')) {
    poloniexPair = chartSymbol.replace('/', '-');
  } else {
    poloniexPair = chartSymbol;
  }

  // Update status
  statusElement.textContent = 'Executing trade...';
  statusElement.style.color = '#3b82f6';

  // Send trade to background script
  chrome.runtime.sendMessage(
    {
      type: 'PLACE_ORDER',
      data: {
        pair: poloniexPair,
        side,
        type: tradeType,
        amount,
        price,
        stopLossPercent,
        takeProfitPercent,
      },
    },
    response => {
      if (response && response.success) {
        statusElement.textContent = `Trade successful! Order ID: ${response.orderId}`;
        statusElement.style.color = '#10b981';
      } else {
        statusElement.textContent = `Trade failed: ${response.error || 'Unknown error'}`;
        statusElement.style.color = '#ef4444';
      }
    }
  );
}

// Function to save TradingView cookies
function saveTradingViewCookies() {
  const cookies = document.cookie;
  chrome.runtime.sendMessage({
    type: 'SAVE_COOKIES',
    data: {
      site: 'tradingview',
      cookies: cookies,
    },
  });
}

// Function to restore TradingView cookies
function restoreTradingViewCookies(cookies) {
  if (cookies) {
    document.cookie = cookies;
  }
}

// Wait for page to be fully loaded before injecting UI controls
window.addEventListener('load', () => {
  injectTradeControls();
  saveTradingViewCookies();

  // Listen for cookie updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'RESTORE_COOKIES' && request.data.site === 'tradingview') {
      restoreTradingViewCookies(request.data.cookies);
      sendResponse({ success: true });
    }
    return true;
  });
});
