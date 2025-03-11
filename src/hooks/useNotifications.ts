import { useState, useEffect, useCallback } from 'react';
import {
  notificationService,
  type Notification,
  type NotificationType,
  type NotificationPreferences,
} from '../services/notificationService';
import { useSettings } from './useSettings';
import { logger } from '../utils/logger';

interface UseNotificationsProps {
  initialLoad?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreferences;
  refreshNotifications: () => Promise<void>;
  createNotification: (
    title: string,
    message: string,
    type: NotificationType,
    metadata?: Record<string, any>
  ) => Promise<string | null>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  updatePreferences: (preferences: NotificationPreferences) => Promise<boolean>;
  showBrowserNotification: (title: string, message: string, icon?: string) => Promise<boolean>;
  createTradeNotification: (
    strategyName: string,
    tradeType: 'BUY' | 'SELL',
    pair: string,
    price: number,
    amount: number,
    pnl?: number
  ) => Promise<string | null>;
  createPerformanceNotification: (
    strategyName: string,
    totalPnL: number,
    winRate: number,
    timeframe?: string
  ) => Promise<string | null>;
}

/**
 * Hook for using the notification service
 */
export const useNotifications = ({
  initialLoad = true,
}: UseNotificationsProps = {}): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    tradeAlerts: true,
    performanceUpdates: true,
    securityAlerts: true,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated } = useSettings();

  // Fetch notifications
  const refreshNotifications = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Only fetch if user is authenticated
      if (isAuthenticated) {
        const data = await notificationService.getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);

        // Get user notification preferences
        const prefs = await notificationService.getNotificationPreferences();
        setPreferences(prefs);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching notifications';
      setError(errorMessage);
      logger.error('Notification loading error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load notifications on component mount if initialLoad is true
  useEffect(() => {
    if (initialLoad && isAuthenticated) {
      void refreshNotifications();
    }
  }, [initialLoad, refreshNotifications, isAuthenticated]);

  // Create a notification
  const createNotification = useCallback(
    async (
      title: string,
      message: string,
      type: NotificationType,
      metadata?: Record<string, any>
    ): Promise<string | null> => {
      try {
        // Check if the notification should be created based on preferences
        const shouldCreate = () => {
          switch (type) {
            case 'TRADE':
              return preferences.tradeAlerts;
            case 'PERFORMANCE':
              return preferences.performanceUpdates;
            case 'SECURITY':
              return preferences.securityAlerts;
            default:
              return true; // Always create other notification types
          }
        };

        if (!shouldCreate()) {
          return null;
        }

        // Only create in database if user is authenticated
        if (isAuthenticated) {
          const notificationId = await notificationService.createNotification(
            title,
            message,
            type,
            metadata
          );

          if (notificationId) {
            // Refresh notifications to update the list
            await refreshNotifications();

            // Optionally show browser notification if push notifications are enabled
            if (preferences.pushNotifications) {
              await notificationService.showBrowserNotification(title, message);
            }
          }

          return notificationId;
        }

        // For non-authenticated users, just show browser notification if enabled
        if (preferences.pushNotifications) {
          await notificationService.showBrowserNotification(title, message);
        }

        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error creating notification';
        setError(errorMessage);
        logger.error('Notification creation error:', errorMessage);
        return null;
      }
    },
    [isAuthenticated, preferences, refreshNotifications]
  );

  // Mark a notification as read
  const markAsRead = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        if (!isAuthenticated) return false;

        const success = await notificationService.markAsRead(id);

        if (success) {
          // Update local state
          setNotifications(prev =>
            prev.map(notification =>
              notification.id === id ? { ...notification, isRead: true } : notification
            )
          );

          // Update unread count
          setUnreadCount(prev => Math.max(0, prev - 1));
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error marking notification as read';
        setError(errorMessage);
        logger.error('Notification mark as read error:', errorMessage);
        return false;
      }
    },
    [isAuthenticated]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      if (!isAuthenticated) return false;

      const success = await notificationService.markAllAsRead();

      if (success) {
        // Update local state
        setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));

        // Update unread count
        setUnreadCount(0);
      }

      return success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error marking all notifications as read';
      setError(errorMessage);
      logger.error('Notification mark all as read error:', errorMessage);
      return false;
    }
  }, [isAuthenticated]);

  // Delete a notification
  const deleteNotification = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        if (!isAuthenticated) return false;

        const success = await notificationService.deleteNotification(id);

        if (success) {
          // Update local state
          const notification = notifications.find(n => n.id === id);
          setNotifications(prev => prev.filter(n => n.id !== id));

          // Update unread count if the notification was unread
          if (notification && !notification.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }

        return success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error deleting notification';
        setError(errorMessage);
        logger.error('Notification deletion error:', errorMessage);
        return false;
      }
    },
    [isAuthenticated, notifications]
  );

  // Update notification preferences
  const updatePreferences = useCallback(
    async (newPreferences: NotificationPreferences): Promise<boolean> => {
      try {
        if (!isAuthenticated) {
          // For non-authenticated users, just update local state
          setPreferences(newPreferences);
          return true;
        }

        const success = await notificationService.updateNotificationPreferences(newPreferences);

        if (success) {
          setPreferences(newPreferences);
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error updating notification preferences';
        setError(errorMessage);
        logger.error('Notification preferences update error:', errorMessage);
        return false;
      }
    },
    [isAuthenticated]
  );

  // Create a trade notification
  const createTradeNotification = useCallback(
    async (
      strategyName: string,
      tradeType: 'BUY' | 'SELL',
      pair: string,
      price: number,
      amount: number,
      pnl?: number
    ): Promise<string | null> => {
      if (!preferences.tradeAlerts) return null;

      return await notificationService.createTradeNotification(
        strategyName,
        tradeType,
        pair,
        price,
        amount,
        pnl
      );
    },
    [preferences.tradeAlerts]
  );

  // Create a performance notification
  const createPerformanceNotification = useCallback(
    async (
      strategyName: string,
      totalPnL: number,
      winRate: number,
      timeframe: string = '24h'
    ): Promise<string | null> => {
      if (!preferences.performanceUpdates) return null;

      return await notificationService.createPerformanceNotification(
        strategyName,
        totalPnL,
        winRate,
        timeframe
      );
    },
    [preferences.performanceUpdates]
  );

  // Show a browser notification
  const showBrowserNotification = useCallback(
    async (title: string, message: string, icon?: string): Promise<boolean> => {
      if (!preferences.pushNotifications) return false;

      return await notificationService.showBrowserNotification(title, message, icon);
    },
    [preferences.pushNotifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    refreshNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    showBrowserNotification,
    createTradeNotification,
    createPerformanceNotification,
  };
};
