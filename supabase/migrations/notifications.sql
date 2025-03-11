-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- INFO, SUCCESS, WARNING, ERROR, TRADE, PERFORMANCE, SECURITY
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  trade_alerts BOOLEAN DEFAULT true,
  performance_updates BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to create a new notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_notification_id UUID;
BEGIN
  -- If p_user_id is provided, use it, otherwise use the authenticated user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Insert the notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    metadata
  ) VALUES (
    v_user_id,
    p_title,
    p_message,
    p_type,
    p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark a notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID,
  p_is_read BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET
    is_read = p_is_read,
    updated_at = now()
  WHERE
    id = p_notification_id
    AND user_id = auth.uid();
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET
    is_read = true,
    updated_at = now()
  WHERE
    user_id = auth.uid()
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a notification
CREATE OR REPLACE FUNCTION public.delete_notification(
  p_notification_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE
    id = p_notification_id
    AND user_id = auth.uid();
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create notification preferences
CREATE OR REPLACE FUNCTION public.get_or_create_notification_preferences()
RETURNS JSONB AS $$
DECLARE
  v_preferences JSONB;
BEGIN
  -- Try to get existing preferences
  SELECT jsonb_build_object(
    'email_notifications', email_notifications,
    'push_notifications', push_notifications,
    'trade_alerts', trade_alerts,
    'performance_updates', performance_updates,
    'security_alerts', security_alerts
  ) INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = auth.uid();
  
  -- If preferences don't exist, create them
  IF v_preferences IS NULL THEN
    INSERT INTO public.notification_preferences (
      user_id
    ) VALUES (
      auth.uid()
    );
    
    -- Return default preferences
    v_preferences := jsonb_build_object(
      'email_notifications', true,
      'push_notifications', true,
      'trade_alerts', true,
      'performance_updates', true,
      'security_alerts', true
    );
  END IF;
  
  RETURN v_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION public.update_notification_preferences(
  p_email_notifications BOOLEAN,
  p_push_notifications BOOLEAN,
  p_trade_alerts BOOLEAN,
  p_performance_updates BOOLEAN,
  p_security_alerts BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.notification_preferences (
    user_id,
    email_notifications,
    push_notifications,
    trade_alerts,
    performance_updates,
    security_alerts
  ) VALUES (
    auth.uid(),
    p_email_notifications,
    p_push_notifications,
    p_trade_alerts,
    p_performance_updates,
    p_security_alerts
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    email_notifications = p_email_notifications,
    push_notifications = p_push_notifications,
    trade_alerts = p_trade_alerts,
    performance_updates = p_performance_updates,
    security_alerts = p_security_alerts,
    updated_at = now();
    
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for system notifications that can be called by triggers
CREATE OR REPLACE FUNCTION public.create_system_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_should_notify BOOLEAN;
BEGIN
  -- Check notification preferences
  SELECT
    CASE
      WHEN p_type = 'TRADE' THEN trade_alerts
      WHEN p_type = 'PERFORMANCE' THEN performance_updates
      WHEN p_type = 'SECURITY' THEN security_alerts
      ELSE true -- Default to true for other notification types
    END INTO v_should_notify
  FROM public.notification_preferences
  WHERE user_id = p_user_id;
  
  -- Default to true if no preferences found
  v_should_notify := COALESCE(v_should_notify, true);
  
  -- Only create notification if the user preferences allow it
  IF v_should_notify THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      metadata
    ) VALUES (
      p_user_id,
      p_title,
      p_message,
      p_type,
      p_metadata
    )
    RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for strategy creation notifications
CREATE OR REPLACE FUNCTION public.notify_strategy_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_system_notification(
    NEW.user_id,
    'Strategy Created',
    'Your ' || NEW.name || ' strategy has been created successfully.',
    'INFO',
    jsonb_build_object('strategy_id', NEW.id, 'strategy_name', NEW.name)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER strategy_created_trigger
AFTER INSERT ON public.strategies
FOR EACH ROW
EXECUTE FUNCTION public.notify_strategy_created();

-- Create trigger for trade execution notifications
CREATE OR REPLACE FUNCTION public.notify_strategy_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_strategy_name TEXT;
  v_user_id UUID;
BEGIN
  -- Get strategy information
  SELECT s.name, s.user_id
  INTO v_strategy_name, v_user_id
  FROM public.strategies s
  WHERE s.id = NEW.strategy_id;
  
  PERFORM public.create_system_notification(
    v_user_id,
    'Trade Executed',
    v_strategy_name || ' ' || NEW.type || ' ' || NEW.amount || ' ' || split_part(NEW.pair, '-', 1) || ' at ' || NEW.price,
    'TRADE',
    jsonb_build_object(
      'strategy_id', NEW.strategy_id,
      'trade_id', NEW.id,
      'pair', NEW.pair,
      'type', NEW.type,
      'price', NEW.price,
      'amount', NEW.amount,
      'total', NEW.total,
      'pnl', NEW.pnl
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER strategy_trade_trigger
AFTER INSERT ON public.strategies_trades
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED')
EXECUTE FUNCTION public.notify_strategy_trade();

-- Row Level Security policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY select_own_notifications ON public.notifications 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_own_notifications ON public.notifications 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_notifications ON public.notifications 
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY delete_own_notifications ON public.notifications 
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for notification_preferences
CREATE POLICY select_own_preferences ON public.notification_preferences 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_own_preferences ON public.notification_preferences 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_preferences ON public.notification_preferences 
  FOR UPDATE USING (user_id = auth.uid());