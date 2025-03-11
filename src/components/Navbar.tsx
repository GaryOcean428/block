import { Menu, User } from 'lucide-react';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import NotificationCenter from './notifications/NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';

const Navbar: React.FC = () => {
  const { hasStoredCredentials } = useSettings();

  // Use the notification system
  const {
    notifications,
    unreadCount,
    preferences,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
  } = useNotifications();

  // Load notifications on mount
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 flex justify-between items-center">
      <div className="flex items-center">
        <button className="mr-2 md:hidden">
          <Menu className="h-6 w-6 text-gray-500" />
        </button>
        <h1 className="text-xl font-bold text-blue-600">Poloniex Futures</h1>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            preferences={preferences}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDeleteNotification={deleteNotification}
            onUpdatePreferences={updatePreferences}
            refreshNotifications={refreshNotifications}
          />
        </div>

        <div className="flex items-center">
          <Link to="/account" className="flex items-center text-gray-500 hover:text-gray-700">
            <User className="h-6 w-6 mr-1" />
            <span className="hidden md:inline-block">
              {hasStoredCredentials ? 'My Account' : 'Connect Account'}
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
