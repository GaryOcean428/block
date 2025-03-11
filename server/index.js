import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import WebSocket from 'ws';

// Configure environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to Poloniex WebSocket for live market data
const connectToPoloniexWebSocket = () => {
  console.log('Connecting to Poloniex WebSocket...');

  // Create WebSocket connection to Poloniex (with reconnection logic)
  const poloniexWs = new WebSocket('wss://ws.poloniex.com/ws/public');

  // Set a timeout to handle connection issues
  const connectionTimeout = setTimeout(() => {
    if (poloniexWs.readyState !== WebSocket.OPEN) {
      console.log('WebSocket connection timeout, reconnecting...');
      poloniexWs.terminate();
      // Try to reconnect in 5 seconds
      setTimeout(connectToPoloniexWebSocket, 5000);
    }
  }, 10000); // 10 second timeout

  poloniexWs.on('open', () => {
    console.log('Connected to Poloniex WebSocket');
    // Clear the connection timeout
    clearTimeout(connectionTimeout);

    // Subscribe to market data channels
    poloniexWs.send(
      JSON.stringify({
        event: 'subscribe',
        channel: ['ticker'],
        symbols: ['BTC_USDT', 'ETH_USDT', 'SOL_USDT'],
      })
    );
  });

  poloniexWs.on('message', data => {
    try {
      const message = JSON.parse(data.toString());

      // Process different types of messages
      if (message.channel === 'ticker' && message.data) {
        // Format the data for our clients
        const formattedData = formatPoloniexTickerData(message.data);

        // Only broadcast valid data
        if (formattedData) {
          // Broadcast to all connected clients
          io.emit('marketData', formattedData);
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  poloniexWs.on('error', error => {
    console.error('Poloniex WebSocket error:', error);
    // Attempt to reconnect after a delay
    setTimeout(connectToPoloniexWebSocket, 5000);
  });

  poloniexWs.on('close', () => {
    console.log('Poloniex WebSocket connection closed');
    // Attempt to reconnect after a delay
    setTimeout(connectToPoloniexWebSocket, 5000);
  });

  // Keep-alive ping
  setInterval(() => {
    if (poloniexWs.readyState === WebSocket.OPEN) {
      poloniexWs.ping();
    }
  }, 30000);

  return poloniexWs;
};

// Format Poloniex ticker data to match our app's data structure
const formatPoloniexTickerData = data => {
  // Safety check for undefined or missing symbol
  if (!data || !data.symbol) {
    console.error('Invalid data received from Poloniex:', data);
    return null;
  }

  try {
    // Convert Poloniex pair format (BTC_USDT) to our format (BTC-USDT)
    const pair = data.symbol.replace('_', '-');

    return {
      pair,
      timestamp: Date.now(),
      open: parseFloat(data.open || 0),
      high: parseFloat(data.high || 0),
      low: parseFloat(data.low || 0),
      close: parseFloat(data.close || 0),
      volume: parseFloat(data.quantity || 0),
    };
  } catch (error) {
    console.error('Error formatting Poloniex data:', error);
    return null;
  }
};

// Socket.IO connection handler
io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // Handle client subscription to market data
  socket.on('subscribeMarket', ({ pair }) => {
    console.log(`Client ${socket.id} subscribed to ${pair}`);
    socket.join(pair);
  });

  // Handle client unsubscription from market data
  socket.on('unsubscribeMarket', ({ pair }) => {
    console.log(`Client ${socket.id} unsubscribed from ${pair}`);
    socket.leave(pair);
  });

  // Handle chat messages
  socket.on('chatMessage', message => {
    console.log('Chat message received:', message);
    // Broadcast to all clients
    io.emit('chatMessage', message);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Poloniex WebSocket connection
const poloniexWs = connectToPoloniexWebSocket();

// Start the server
const PORT = process.env.PORT || 8765;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');

  // Close Poloniex WebSocket
  if (poloniexWs && poloniexWs.readyState === WebSocket.OPEN) {
    poloniexWs.close();
  }

  // Close HTTP server
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
