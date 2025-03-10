import { useContext } from 'react';
import TradingContext from '../context/TradingContext';
import type { TradingContextType } from '../types/TradingContextType';

/**
 * Custom hook to use the Trading context
 * @returns Trading context value
 * @throws Error if used outside of TradingProvider
 */
export const useTradingContext = (): TradingContextType => {
  const context = useContext(TradingContext);

  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }

  return context;
};

export default useTradingContext;
