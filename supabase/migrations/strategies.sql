-- Create strategies table to store user trading strategies
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parameters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false
);

-- Create strategies_performance table to track performance metrics
CREATE TABLE IF NOT EXISTS public.strategies_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  total_pnl NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  trades_count INTEGER DEFAULT 0,
  drawdown NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC DEFAULT 0,
  last_trade_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create strategies_trades table to track individual trades
CREATE TABLE IF NOT EXISTS public.strategies_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  type TEXT NOT NULL, -- BUY or SELL
  price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL, -- PENDING, COMPLETED, CANCELLED, FAILED
  pnl NUMERIC DEFAULT 0,
  pnl_percent NUMERIC DEFAULT 0,
  metadata JSONB
);

-- Create strategies_filters table to store strategy filters
CREATE TABLE IF NOT EXISTS public.strategies_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  parameters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to create a new strategy
CREATE OR REPLACE FUNCTION public.create_strategy(
  p_name TEXT,
  p_type TEXT,
  p_parameters JSONB,
  p_active BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_strategy_id UUID;
BEGIN
  INSERT INTO public.strategies (
    user_id,
    name,
    type,
    parameters,
    active
  ) VALUES (
    auth.uid(),
    p_name,
    p_type,
    p_parameters,
    p_active
  )
  RETURNING id INTO v_strategy_id;
  
  -- Create initial performance record
  INSERT INTO public.strategies_performance (
    strategy_id
  ) VALUES (
    v_strategy_id
  );
  
  RETURN v_strategy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a strategy
CREATE OR REPLACE FUNCTION public.update_strategy(
  p_strategy_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_parameters JSONB,
  p_active BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.strategies
  SET
    name = p_name,
    type = p_type,
    parameters = p_parameters,
    active = p_active,
    updated_at = now()
  WHERE
    id = p_strategy_id
    AND user_id = auth.uid();
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a strategy
CREATE OR REPLACE FUNCTION public.delete_strategy(
  p_strategy_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.strategies
  WHERE
    id = p_strategy_id
    AND user_id = auth.uid();
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a strategy filter
CREATE OR REPLACE FUNCTION public.add_strategy_filter(
  p_strategy_id UUID,
  p_type TEXT,
  p_parameters JSONB
)
RETURNS UUID AS $$
DECLARE
  v_filter_id UUID;
  v_strategy_owner UUID;
BEGIN
  -- Check if the user owns the strategy
  SELECT user_id INTO v_strategy_owner
  FROM public.strategies
  WHERE id = p_strategy_id;
  
  IF v_strategy_owner != auth.uid() THEN
    RAISE EXCEPTION 'User does not own this strategy';
  END IF;
  
  INSERT INTO public.strategies_filters (
    strategy_id,
    type,
    parameters
  ) VALUES (
    p_strategy_id,
    p_type,
    p_parameters
  )
  RETURNING id INTO v_filter_id;
  
  RETURN v_filter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a trade for a strategy
CREATE OR REPLACE FUNCTION public.record_strategy_trade(
  p_strategy_id UUID,
  p_pair TEXT,
  p_type TEXT,
  p_price NUMERIC,
  p_amount NUMERIC,
  p_status TEXT,
  p_pnl NUMERIC DEFAULT 0,
  p_pnl_percent NUMERIC DEFAULT 0,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_trade_id UUID;
  v_total NUMERIC;
  v_is_win BOOLEAN;
BEGIN
  -- Calculate total
  v_total := p_price * p_amount;
  
  -- Insert the trade
  INSERT INTO public.strategies_trades (
    strategy_id,
    pair,
    type,
    price,
    amount,
    total,
    status,
    pnl,
    pnl_percent,
    metadata
  ) VALUES (
    p_strategy_id,
    p_pair,
    p_type,
    p_price,
    p_amount,
    v_total,
    p_status,
    p_pnl,
    p_pnl_percent,
    p_metadata
  )
  RETURNING id INTO v_trade_id;
  
  -- Update performance metrics if the trade is completed
  IF p_status = 'COMPLETED' THEN
    v_is_win := (p_pnl > 0);
    
    UPDATE public.strategies_performance
    SET
      total_pnl = total_pnl + p_pnl,
      trades_count = trades_count + 1,
      win_rate = CASE 
        WHEN trades_count = 0 THEN CASE WHEN v_is_win THEN 1.0 ELSE 0.0 END
        ELSE ((win_rate * trades_count) + CASE WHEN v_is_win THEN 1 ELSE 0 END) / (trades_count + 1)
      END,
      last_trade_at = now(),
      updated_at = now()
    WHERE
      strategy_id = p_strategy_id;
  END IF;
  
  RETURN v_trade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security policies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategies
CREATE POLICY select_own_strategies ON public.strategies 
  FOR SELECT USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY insert_own_strategies ON public.strategies 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_strategies ON public.strategies 
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY delete_own_strategies ON public.strategies 
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for strategies_performance
CREATE POLICY select_own_performance ON public.strategies_performance 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.strategies s 
      WHERE s.id = strategy_id AND (s.user_id = auth.uid() OR s.is_shared = true)
    )
  );

-- RLS Policies for strategies_trades
CREATE POLICY select_own_trades ON public.strategies_trades 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.strategies s 
      WHERE s.id = strategy_id AND (s.user_id = auth.uid() OR s.is_shared = true)
    )
  );

-- RLS Policies for strategies_filters
CREATE POLICY select_own_filters ON public.strategies_filters 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.strategies s 
      WHERE s.id = strategy_id AND (s.user_id = auth.uid() OR s.is_shared = true)
    )
  );

CREATE POLICY insert_own_filters ON public.strategies_filters 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.strategies s 
      WHERE s.id = strategy_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY update_own_filters ON public.strategies_filters 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.strategies s 
      WHERE s.id = strategy_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY delete_own_filters ON public.strategies_filters 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.strategies s 
      WHERE s.id = strategy_id AND s.user_id = auth.uid()
    )
  );