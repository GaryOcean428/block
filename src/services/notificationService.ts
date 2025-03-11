import { supabase } from './supabase';
import { logger } from '../utils/logger';

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'TRADE'
  | 'PERFORMANCE'
  | 'SECURITY';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  tradeAlerts: boolean;
  performanceUpdates: boolean;
  securityAlerts: boolean;
}

/**
 * Service for managing user notifications in the application
 */
export const notificationService = {
  /**
   * Get notifications for the current user
   */
  async getNotifications(): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching notifications:', error);
        throw new Error(error.message);
      }

      return data.map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type as NotificationType,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        metadata: notification.metadata,
      }));
    } catch (error) {
      logger.error('Exception fetching notifications:', error);
      return [];
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) {
        logger.error('Error counting unread notifications:', error);
        throw new Error(error.message);
      }

      return count || 0;
    } catch (error) {
      logger.error('Exception counting unread notifications:', error);
      return 0;
    }
  },

  /**
   * Create a new notification
   */
  async createNotification(
    title: string,
    message: string,
    type: NotificationType,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_notification', {
        p_title: title,
        p_message: message,
        p_type: type,
        p_metadata: metadata,
      });

      if (error) {
        logger.error('Error creating notification:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception creating notification:', error);
      return null;
    }
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, isRead = true): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: id,
        p_is_read: isRead,
      });

      if (error) {
        logger.error('Error marking notification as read:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception marking notification as read:', error);
      return false;
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) {
        logger.error('Error marking all notifications as read:', error);
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      logger.error('Exception marking all notifications as read:', error);
      return false;
    }
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('delete_notification', {
        p_notification_id: id,
      });

      if (error) {
        logger.error('Error deleting notification:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception deleting notification:', error);
      return false;
    }
  },

  /**
   * Get notification preferences for the current user
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_notification_preferences');

      if (error) {
        logger.error('Error fetching notification preferences:', error);
        throw new Error(error.message);
      }

      return {
        emailNotifications: data.email_notifications,
        pushNotifications: data.push_notifications,
        tradeAlerts: data.trade_alerts,
        performanceUpdates: data.performance_updates,
        securityAlerts: data.security_alerts,
      };
    } catch (error) {
      logger.error('Exception fetching notification preferences:', error);
      // Return default preferences if there's an error
      return {
        emailNotifications: true,
        pushNotifications: true,
        tradeAlerts: true,
        performanceUpdates: true,
        securityAlerts: true,
      };
    }
  },

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_notification_preferences', {
        p_email_notifications: preferences.emailNotifications,
        p_push_notifications: preferences.pushNotifications,
        p_trade_alerts: preferences.tradeAlerts,
        p_performance_updates: preferences.performanceUpdates,
        p_security_alerts: preferences.securityAlerts,
      });

      if (error) {
        logger.error('Error updating notification preferences:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Exception updating notification preferences:', error);
      return false;
    }
  },

  /**
   * Create a trade notification
   */
  async createTradeNotification(
    strategyName: string,
    tradeType: 'BUY' | 'SELL',
    pair: string,
    price: number,
    amount: number,
    pnl?: number
  ): Promise<string | null> {
    const pairBase = pair.split('-')[0] || pair.split('/')[0] || pair;

    const title = `${tradeType} ${pairBase} Trade Executed`;
    const message = `${strategyName} strategy ${tradeType.toLowerCase()}ing ${amount} ${pairBase} at $${price}`;

    const metadata: Record<string, any> = {
      strategyName,
      tradeType,
      pair,
      price,
      amount,
      total: price * amount,
    };

    if (pnl !== undefined) {
      metadata.pnl = pnl;
    }

    return this.createNotification(title, message, 'TRADE', metadata);
  },

  /**
   * Create a performance notification
   */
  async createPerformanceNotification(
    strategyName: string,
    totalPnL: number,
    winRate: number,
    timeframe: string = '24h'
  ): Promise<string | null> {
    const title = `${strategyName} Performance Update`;
    const pnlFormatted =
      totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`;
    const message = `Your ${strategyName} strategy has a ${pnlFormatted} P&L (${(winRate * 100).toFixed(1)}% win rate) over the last ${timeframe}.`;

    return this.createNotification(title, message, 'PERFORMANCE', {
      strategyName,
      totalPnL,
      winRate,
      timeframe,
    });
  },

  /**
   * Create a security notification
   */
  async createSecurityNotification(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    return this.createNotification(title, message, 'SECURITY', metadata);
  },

  /**
   * Create a success notification
   */
  async createSuccessNotification(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    return this.createNotification(title, message, 'SUCCESS', metadata);
  },

  /**
   * Create a warning notification
   */
  async createWarningNotification(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    return this.createNotification(title, message, 'WARNING', metadata);
  },

  /**
   * Create an error notification
   */
  async createErrorNotification(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    return this.createNotification(title, message, 'ERROR', metadata);
  },

  /**
   * Show a browser notification if supported
   */
  async showBrowserNotification(title: string, message: string, icon?: string): Promise<boolean> {
    try {
      // Check if browser notifications are supported
      if (!('Notification' in window)) {
        logger.error('Browser notifications not supported');
        return false;
      }

      // Check if permission is already granted
      if (Notification.permission === 'granted') {
        // Show notification
        new Notification(title, {
          body: message,
          icon: icon || '/icons/icon128.png',
        });
        return true;
      }

      // Request permission if not already denied
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          // Show notification
          new Notification(title, {
            body: message,
            icon: icon || '/icons/icon128.png',
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Exception showing browser notification:', error);
      return false;
    }
  },
};
