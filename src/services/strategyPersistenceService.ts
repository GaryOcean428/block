import { supabase } from './supabase';
import {
  Strategy,
  StrategyType,
  StrategyParameters,
  StrategyPerformance,
  Filter,
  StrategyWithFilters,
} from '../types/strategy';
import type { Trade } from '../types';
import { logger } from '../utils/logger';

interface CreateStrategyParams {
  name: string;
  type: StrategyType;
  parameters: StrategyParameters;
  active?: boolean;
}

interface StrategyTradeParams {
  strategyId: string;
  pair: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  pnl?: number;
  pnlPercent?: number;
  metadata?: Record<string, any>;
}

interface StrategyFilterParams {
  strategyId: string;
  type: Filter['type'];
  parameters: Filter['parameters'];
}

/**
 * Service for managing strategy persistence in Supabase
 */
export const strategyPersistenceService = {
  /**
   * Create a new strategy
   */
  async createStrategy({
    name,
    type,
    parameters,
    active = false,
  }: CreateStrategyParams): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_strategy', {
        p_name: name,
        p_type: type,
        p_parameters: parameters,
        p_active: active,
      });

      if (error) {
        logger.error('Error creating strategy:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception creating strategy:', error);
      return null;
    }
  },

  /**
   * Update an existing strategy
   */
  async updateStrategy(
    id: string,
    { name, type, parameters, active = false }: CreateStrategyParams
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_strategy', {
        p_strategy_id: id,
        p_name: name,
        p_type: type,
        p_parameters: parameters,
        p_active: active,
      });

      if (error) {
        logger.error('Error updating strategy:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception updating strategy:', error);
      return false;
    }
  },

  /**
   * Delete a strategy
   */
  async deleteStrategy(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('delete_strategy', {
        p_strategy_id: id,
      });

      if (error) {
        logger.error('Error deleting strategy:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception deleting strategy:', error);
      return false;
    }
  },

  /**
   * Get all strategies for the current user
   */
  async getStrategies(): Promise<Strategy[]> {
    try {
      const { data: strategies, error } = await supabase.from('strategies').select('*');

      if (error) {
        logger.error('Error fetching strategies:', error);
        throw new Error(error.message);
      }

      // Fetch performance data for each strategy
      const strategiesWithPerformance = await Promise.all(
        strategies.map(async strategy => {
          const { data: performanceData, error: performanceError } = await supabase
            .from('strategies_performance')
            .select('*')
            .eq('strategy_id', strategy.id)
            .single();

          if (performanceError && performanceError.code !== 'PGRST116') {
            logger.error('Error fetching performance data:', performanceError);
          }

          const performance: StrategyPerformance | undefined = performanceData
            ? {
                totalPnL: performanceData.total_pnl,
                winRate: performanceData.win_rate,
                tradesCount: performanceData.trades_count,
                drawdown: performanceData.drawdown || 0,
                sharpeRatio: performanceData.sharpe_ratio || 0,
              }
            : undefined;

          return {
            id: strategy.id,
            name: strategy.name,
            type: strategy.type as StrategyType,
            parameters: strategy.parameters as StrategyParameters,
            created: strategy.created_at,
            performance,
          };
        })
      );

      return strategiesWithPerformance;
    } catch (error) {
      logger.error('Exception fetching strategies:', error);
      return [];
    }
  },

  /**
   * Get a strategy by ID with its filters
   */
  async getStrategyWithFilters(id: string): Promise<StrategyWithFilters | null> {
    try {
      const { data: strategy, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error fetching strategy:', error);
        throw new Error(error.message);
      }

      // Fetch performance data
      const { data: performanceData, error: performanceError } = await supabase
        .from('strategies_performance')
        .select('*')
        .eq('strategy_id', id)
        .single();

      if (performanceError && performanceError.code !== 'PGRST116') {
        logger.error('Error fetching performance data:', performanceError);
      }

      // Fetch filters
      const { data: filtersData, error: filtersError } = await supabase
        .from('strategies_filters')
        .select('*')
        .eq('strategy_id', id);

      if (filtersError) {
        logger.error('Error fetching filters:', filtersError);
      }

      const filters: Filter[] =
        filtersData?.map(filter => ({
          type: filter.type as Filter['type'],
          parameters: filter.parameters,
        })) || [];

      const performance: StrategyPerformance | undefined = performanceData
        ? {
            totalPnL: performanceData.total_pnl,
            winRate: performanceData.win_rate,
            tradesCount: performanceData.trades_count,
            drawdown: performanceData.drawdown || 0,
            sharpeRatio: performanceData.sharpe_ratio || 0,
          }
        : undefined;

      return {
        id: strategy.id,
        name: strategy.name,
        type: strategy.type as StrategyType,
        parameters: strategy.parameters as StrategyParameters,
        created: strategy.created_at,
        performance,
        filters,
      };
    } catch (error) {
      logger.error('Exception fetching strategy with filters:', error);
      return null;
    }
  },

  /**
   * Add a filter to a strategy
   */
  async addStrategyFilter({
    strategyId,
    type,
    parameters,
  }: StrategyFilterParams): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('add_strategy_filter', {
        p_strategy_id: strategyId,
        p_type: type,
        p_parameters: parameters,
      });

      if (error) {
        logger.error('Error adding strategy filter:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception adding strategy filter:', error);
      return null;
    }
  },

  /**
   * Record a trade executed by a strategy
   */
  async recordStrategyTrade({
    strategyId,
    pair,
    type,
    price,
    amount,
    status,
    pnl = 0,
    pnlPercent = 0,
    metadata = {},
  }: StrategyTradeParams): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('record_strategy_trade', {
        p_strategy_id: strategyId,
        p_pair: pair,
        p_type: type,
        p_price: price,
        p_amount: amount,
        p_status: status,
        p_pnl: pnl,
        p_pnl_percent: pnlPercent,
        p_metadata: metadata,
      });

      if (error) {
        logger.error('Error recording strategy trade:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception recording strategy trade:', error);
      return null;
    }
  },

  /**
   * Get trades for a strategy
   */
  async getStrategyTrades(strategyId: string): Promise<Trade[]> {
    try {
      const { data, error } = await supabase
        .from('strategies_trades')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('timestamp', { ascending: false });

      if (error) {
        logger.error('Error fetching strategy trades:', error);
        throw new Error(error.message);
      }

      return data.map(trade => ({
        id: trade.id,
        strategyId: trade.strategy_id,
        pair: trade.pair,
        timestamp: new Date(trade.timestamp).getTime(),
        type: trade.type as 'BUY' | 'SELL',
        price: trade.price,
        amount: trade.amount,
        total: trade.total,
        pnl: trade.pnl,
        pnlPercent: trade.pnl_percent,
        status: trade.status,
      }));
    } catch (error) {
      logger.error('Exception fetching strategy trades:', error);
      return [];
    }
  },

  /**
   * Toggle strategy active status
   */
  async toggleStrategyActive(id: string, active: boolean): Promise<boolean> {
    try {
      const { data: strategy, error: fetchError } = await supabase
        .from('strategies')
        .select('name, type, parameters')
        .eq('id', id)
        .single();

      if (fetchError) {
        logger.error('Error fetching strategy:', fetchError);
        throw new Error(fetchError.message);
      }

      const { data, error } = await supabase.rpc('update_strategy', {
        p_strategy_id: id,
        p_name: strategy.name,
        p_type: strategy.type,
        p_parameters: strategy.parameters,
        p_active: active,
      });

      if (error) {
        logger.error('Error toggling strategy active status:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception toggling strategy active status:', error);
      return false;
    }
  },

  /**
   * Share a strategy (make it public)
   */
  async shareStrategy(id: string, shared: boolean): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .update({ is_shared: shared })
        .eq('id', id);

      if (error) {
        logger.error('Error sharing strategy:', error);
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      logger.error('Exception sharing strategy:', error);
      return false;
    }
  },

  /**
   * Get public shared strategies
   */
  async getSharedStrategies(): Promise<Strategy[]> {
    try {
      const { data: strategies, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('is_shared', true);

      if (error) {
        logger.error('Error fetching shared strategies:', error);
        throw new Error(error.message);
      }

      return strategies.map(strategy => ({
        id: strategy.id,
        name: strategy.name,
        type: strategy.type as StrategyType,
        parameters: strategy.parameters as StrategyParameters,
        created: strategy.created_at,
      }));
    } catch (error) {
      logger.error('Exception fetching shared strategies:', error);
      return [];
    }
  },
};
