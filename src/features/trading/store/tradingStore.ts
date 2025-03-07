/**
 * Trading store - maintains global trading state
 * Uses Zustand with immer for immutable state updates
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@config/constants';

export interface Position {
  id: string;
  pair: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  leverage: number;
  margin: number;
  liquidationPrice: number;
  side: 'long' | 'short';
  timestamp: number;
}

export interface Order {
  id: string;
  pair: string;
  type: 'market' | 'limit' | 'stop' | 'stopLimit';
  side: 'buy' | 'sell';
  size: number;
  price: number;
  status: 'open' | 'filled' | 'cancelled' | 'rejected';
  timestamp: number;
}

interface TradingState {
  // Current positions
  positions: Position[];
  
  // Open orders
  orders: Order[];
  
  // Active trading pairs
  activePairs: string[];
  selectedPair: string;
  
  // Market data
  marketData: Record<string, any>;
  
  // Trading state
  isLiveTrading: boolean;
  isConnected: boolean;
  connectionError: string | null;
  
  // Actions
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  closePosition: (id: string) => void;
  
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  cancelOrder: (id: string) => void;
  
  setActivePairs: (pairs: string[]) => void;
  setSelectedPair: (pair: string) => void;
  
  updateMarketData: (pair: string, data: any) => void;
  
  setLiveTrading: (isLive: boolean) => void;
  setConnectionStatus: (isConnected: boolean, error?: string | null) => void;
}

// Create trading store with persistence
export const useTradingStore = create<TradingState>()(
  persist(
    immer((set) => ({
      // Initial state
      positions: [],
      orders: [],
      activePairs: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'],
      selectedPair: 'BTC-USDT',
      marketData: {},
      isLiveTrading: false,
      isConnected: false,
      connectionError: null,
      
      // Actions for positions
      addPosition: (position) => set((state) => {
        state.positions.push(position);
      }),
      
      updatePosition: (id, updates) => set((state) => {
        const positionIndex = state.positions.findIndex(p => p.id === id);
        if (positionIndex !== -1) {
          Object.assign(state.positions[positionIndex], updates);
        }
      }),
      
      closePosition: (id) => set((state) => {
        state.positions = state.positions.filter(p => p.id !== id);
      }),
      
      // Actions for orders
      addOrder: (order) => set((state) => {
        state.orders.push(order);
      }),
      
      updateOrder: (id, updates) => set((state) => {
        const orderIndex = state.orders.findIndex(o => o.id === id);
        if (orderIndex !== -1) {
          Object.assign(state.orders[orderIndex], updates);
        }
      }),
      
      cancelOrder: (id) => set((state) => {
        const orderIndex = state.orders.findIndex(o => o.id === id);
        if (orderIndex !== -1) {
          state.orders[orderIndex].status = 'cancelled';
        }
      }),
      
      // Actions for trading pairs
      setActivePairs: (pairs) => set((state) => {
        state.activePairs = pairs;
      }),
      
      setSelectedPair: (pair) => set((state) => {
        state.selectedPair = pair;
      }),
      
      // Actions for market data
      updateMarketData: (pair, data) => set((state) => {
        state.marketData[pair] = data;
      }),
      
      // Actions for connection status
      setLiveTrading: (isLive) => set((state) => {
        state.isLiveTrading = isLive;
      }),
      
      setConnectionStatus: (isConnected, error = null) => set((state) => {
        state.isConnected = isConnected;
        state.connectionError = error;
      }),
    })),
    {
      name: STORAGE_KEYS.STRATEGIES,
      partialize: (state) => ({
        activePairs: state.activePairs,
        selectedPair: state.selectedPair,
        isLiveTrading: state.isLiveTrading,
      }),
    }
  )
);
