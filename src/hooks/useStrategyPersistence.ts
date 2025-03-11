import { useState, useEffect, useCallback } from 'react';
import { strategyPersistenceService } from '../services/strategyPersistenceService';
import type {
  Strategy,
  StrategyType,
  StrategyParameters,
  Filter,
  StrategyWithFilters,
} from '../types/strategy';
import type { Trade } from '../types';

interface UseStrategyPersistenceProps {
  initialLoad?: boolean;
}

interface UseStrategyPersistenceReturn {
  strategies: Strategy[];
  loading: boolean;
  error: string | null;
  createStrategy: (
    name: string,
    type: StrategyType,
    parameters: StrategyParameters,
    active?: boolean
  ) => Promise<string | null>;
  updateStrategy: (
    id: string,
    name: string,
    type: StrategyType,
    parameters: StrategyParameters,
    active?: boolean
  ) => Promise<boolean>;
  deleteStrategy: (id: string) => Promise<boolean>;
  getStrategyWithFilters: (id: string) => Promise<StrategyWithFilters | null>;
  addStrategyFilter: (
    strategyId: string,
    type: Filter['type'],
    parameters: Filter['parameters']
  ) => Promise<string | null>;
  recordStrategyTrade: (
    strategyId: string,
    pair: string,
    type: 'BUY' | 'SELL',
    price: number,
    amount: number,
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED',
    pnl?: number,
    pnlPercent?: number,
    metadata?: Record<string, any>
  ) => Promise<string | null>;
  getStrategyTrades: (strategyId: string) => Promise<Trade[]>;
  toggleStrategyActive: (id: string, active: boolean) => Promise<boolean>;
  shareStrategy: (id: string, shared: boolean) => Promise<boolean>;
  getSharedStrategies: () => Promise<Strategy[]>;
  refreshStrategies: () => Promise<void>;
}

/**
 * Hook for using the strategy persistence service
 */
export const useStrategyPersistence = ({
  initialLoad = true,
}: UseStrategyPersistenceProps = {}): UseStrategyPersistenceReturn => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStrategies = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await strategyPersistenceService.getStrategies();
      setStrategies(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching strategies';
      setError(errorMessage);
      console.error('Strategy loading error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load strategies on initial mount if initialLoad is true
  useEffect(() => {
    if (initialLoad) {
      void refreshStrategies();
    }
  }, [initialLoad, refreshStrategies]);

  const createStrategy = useCallback(
    async (
      name: string,
      type: StrategyType,
      parameters: StrategyParameters,
      active = false
    ): Promise<string | null> => {
      try {
        setLoading(true);
        setError(null);

        const strategyId = await strategyPersistenceService.createStrategy({
          name,
          type,
          parameters,
          active,
        });

        if (strategyId) {
          await refreshStrategies();
        }

        return strategyId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error creating strategy';
        setError(errorMessage);
        console.error('Strategy creation error:', errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [refreshStrategies]
  );

  const updateStrategy = useCallback(
    async (
      id: string,
      name: string,
      type: StrategyType,
      parameters: StrategyParameters,
      active = false
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const success = await strategyPersistenceService.updateStrategy(id, {
          name,
          type,
          parameters,
          active,
        });

        if (success) {
          await refreshStrategies();
        }

        return success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error updating strategy';
        setError(errorMessage);
        console.error('Strategy update error:', errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshStrategies]
  );

  const deleteStrategy = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const success = await strategyPersistenceService.deleteStrategy(id);

      if (success) {
        setStrategies(prevStrategies => prevStrategies.filter(strategy => strategy.id !== id));
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting strategy';
      setError(errorMessage);
      console.error('Strategy deletion error:', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStrategyWithFilters = useCallback(
    async (id: string): Promise<StrategyWithFilters | null> => {
      try {
        setLoading(true);
        setError(null);
        return await strategyPersistenceService.getStrategyWithFilters(id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching strategy';
        setError(errorMessage);
        console.error('Strategy fetch error:', errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const addStrategyFilter = useCallback(
    async (
      strategyId: string,
      type: Filter['type'],
      parameters: Filter['parameters']
    ): Promise<string | null> => {
      try {
        setLoading(true);
        setError(null);
        return await strategyPersistenceService.addStrategyFilter({
          strategyId,
          type,
          parameters,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error adding filter';
        setError(errorMessage);
        console.error('Filter addition error:', errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const recordStrategyTrade = useCallback(
    async (
      strategyId: string,
      pair: string,
      type: 'BUY' | 'SELL',
      price: number,
      amount: number,
      status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED',
      pnl = 0,
      pnlPercent = 0,
      metadata = {}
    ): Promise<string | null> => {
      try {
        return await strategyPersistenceService.recordStrategyTrade({
          strategyId,
          pair,
          type,
          price,
          amount,
          status,
          pnl,
          pnlPercent,
          metadata,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error recording trade';
        console.error('Trade recording error:', errorMessage);
        return null;
      }
    },
    []
  );

  const getStrategyTrades = useCallback(async (strategyId: string): Promise<Trade[]> => {
    try {
      return await strategyPersistenceService.getStrategyTrades(strategyId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching trades';
      console.error('Trades fetch error:', errorMessage);
      return [];
    }
  }, []);

  const toggleStrategyActive = useCallback(
    async (id: string, active: boolean): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const success = await strategyPersistenceService.toggleStrategyActive(id, active);

        if (success) {
          await refreshStrategies();
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error toggling strategy active status';
        setError(errorMessage);
        console.error('Strategy toggle error:', errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshStrategies]
  );

  const shareStrategy = useCallback(
    async (id: string, shared: boolean): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const success = await strategyPersistenceService.shareStrategy(id, shared);

        if (success) {
          await refreshStrategies();
        }

        return success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error sharing strategy';
        setError(errorMessage);
        console.error('Strategy sharing error:', errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshStrategies]
  );

  const getSharedStrategies = useCallback(async (): Promise<Strategy[]> => {
    try {
      return await strategyPersistenceService.getSharedStrategies();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching shared strategies';
      console.error('Shared strategies fetch error:', errorMessage);
      return [];
    }
  }, []);

  return {
    strategies,
    loading,
    error,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    getStrategyWithFilters,
    addStrategyFilter,
    recordStrategyTrade,
    getStrategyTrades,
    toggleStrategyActive,
    shareStrategy,
    getSharedStrategies,
    refreshStrategies,
  };
};
