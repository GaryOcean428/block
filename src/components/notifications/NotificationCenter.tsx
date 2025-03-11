import React, { useState } from 'react';
import {
  Bell,
  Check,
  Trash2,
  X,
  Settings,
  AlertTriangle,
  Ban,
  Info,
  Check as CheckIcon,
} from 'lucide-react';
import {
  type Notification,
  type NotificationPreferences,
  type NotificationType,
} from '../../services/notificationService';

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onUpdatePreferences: (preferences: NotificationPreferences) => void;
  refreshNotifications: () => void;
}

/**
 * Component for displaying and managing user notifications
 */
const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  preferences,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onUpdatePreferences,
  refreshNotifications,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<NotificationPreferences>(preferences);

  // Toggle notification panel
  const togglePanel = () => {
    if (!isOpen) {
      refreshNotifications();
    }
    setIsOpen(!isOpen);
    setShowSettings(false);
  };

  // Get icon for notification type
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'ERROR':
        return <Ban className="h-5 w-5 text-red-500" />;
      case 'TRADE':
        return (
          <span className="h-5 w-5 flex items-center justify-center text-blue-500 font-bold">
            $
          </span>
        );
      case 'SECURITY':
        return (
          <span className="h-5 w-5 flex items-center justify-center text-purple-500 font-bold">
            !
          </span>
        );
      case 'PERFORMANCE':
        return (
          <span className="h-5 w-5 flex items-center justify-center text-green-500 font-bold">
            %
          </span>
        );
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  // Get background color for notification type
  const getTypeBgColor = (type: NotificationType): string => {
    switch (type) {
      case 'SUCCESS':
        return 'bg-green-50';
      case 'WARNING':
        return 'bg-yellow-50';
      case 'ERROR':
        return 'bg-red-50';
      case 'TRADE':
        return 'bg-blue-50';
      case 'SECURITY':
        return 'bg-purple-50';
      case 'PERFORMANCE':
        return 'bg-green-50';
      default:
        return 'bg-gray-50';
    }
  };

  // Format notification date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Save notification preferences
  const savePreferences = () => {
    onUpdatePreferences(tempPreferences);
    setShowSettings(false);
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
        onClick={togglePanel}
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl z-50 border border-gray-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Notification settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={onMarkAllAsRead}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Mark all as read"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Close notifications"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showSettings ? (
            // Notification Settings
            <div className="p-4 overflow-y-auto">
              <h4 className="font-medium text-gray-800 mb-4">Notification Preferences</h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="emailNotifications" className="text-sm text-gray-700">
                    Email Notifications
                  </label>
                  <input
                    id="emailNotifications"
                    type="checkbox"
                    checked={tempPreferences.emailNotifications}
                    onChange={e =>
                      setTempPreferences({
                        ...tempPreferences,
                        emailNotifications: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="pushNotifications" className="text-sm text-gray-700">
                    Push Notifications
                  </label>
                  <input
                    id="pushNotifications"
                    type="checkbox"
                    checked={tempPreferences.pushNotifications}
                    onChange={e =>
                      setTempPreferences({
                        ...tempPreferences,
                        pushNotifications: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="tradeAlerts" className="text-sm text-gray-700">
                    Trade Alerts
                  </label>
                  <input
                    id="tradeAlerts"
                    type="checkbox"
                    checked={tempPreferences.tradeAlerts}
                    onChange={e =>
                      setTempPreferences({
                        ...tempPreferences,
                        tradeAlerts: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="performanceUpdates" className="text-sm text-gray-700">
                    Performance Updates
                  </label>
                  <input
                    id="performanceUpdates"
                    type="checkbox"
                    checked={tempPreferences.performanceUpdates}
                    onChange={e =>
                      setTempPreferences({
                        ...tempPreferences,
                        performanceUpdates: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="securityAlerts" className="text-sm text-gray-700">
                    Security Alerts
                  </label>
                  <input
                    id="securityAlerts"
                    type="checkbox"
                    checked={tempPreferences.securityAlerts}
                    onChange={e =>
                      setTempPreferences({
                        ...tempPreferences,
                        securityAlerts: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setTempPreferences(preferences);
                    setShowSettings(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreferences}
                  className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            // Notification List
            <>
              <div className="overflow-y-auto flex-grow">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p>No notifications yet</p>
                    <p className="text-sm mt-1">
                      We'll notify you when something important happens
                    </p>
                  </div>
                ) : (
                  <div>
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 ${
                          notification.isRead ? 'bg-white' : getTypeBgColor(notification.type)
                        } hover:bg-gray-50 transition-colors duration-150`}
                      >
                        <div className="flex">
                          <div className="flex-shrink-0 mr-3 mt-1">
                            {getTypeIcon(notification.type)}
                          </div>
                          <div className="flex-grow">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {notification.title}
                              </h4>
                              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                {formatDate(notification.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                            <div className="flex justify-end space-x-2">
                              {!notification.isRead && (
                                <button
                                  onClick={() => onMarkAsRead(notification.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Mark as read
                                </button>
                              )}
                              <button
                                onClick={() => onDeleteNotification(notification.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={onMarkAllAsRead}
                      disabled={unreadCount === 0}
                      className={`text-xs font-medium ${
                        unreadCount > 0
                          ? 'text-blue-600 hover:text-blue-800'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Mark all as read
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
