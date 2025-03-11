import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings, 
  ChevronDown,
  Zap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { signOut } from '../services/auth';
import NotificationCenter from './notifications/NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { hasStoredCredentials } = useSettings();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfileMenu = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  return (
    <nav className="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 px-4 py-2.5 flex justify-between items-center">
      <div className="flex items-center">
        <button 
          className="mr-2 md:hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1 rounded"
          onClick={toggleMenu}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          ) : (
            <Menu className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          )}
        </button>
        
        <Link to="/" className="flex items-center">
          <Zap className="h-7 w-7 text-blue-600 mr-1.5" />
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Block Trader</h1>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex ml-10 space-x-4">
          {isAuthenticated && (
            <>
              <Link 
                to="/dashboard" 
                className="px-3 py-2 rounded-md text-sm font-medium 
                  text-gray-600 hover:text-gray-900 hover:bg-gray-100
                  dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              >
                Dashboard
              </Link>
              <Link 
                to="/strategies" 
                className="px-3 py-2 rounded-md text-sm font-medium 
                  text-gray-600 hover:text-gray-900 hover:bg-gray-100
                  dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              >
                Strategies
              </Link>
              <Link 
                to="/auto-trader" 
                className="px-3 py-2 rounded-md text-sm font-medium 
                  text-gray-600 hover:text-gray-900 hover:bg-gray-100
                  dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              >
                Auto Trader
              </Link>
              <Link 
                to="/extension-download" 
                className="px-3 py-2 rounded-md text-sm font-medium 
                  text-gray-600 hover:text-gray-900 hover:bg-gray-100
                  dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              >
                Extension
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {isAuthenticated && (
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
        )}

        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={toggleProfileMenu}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
            >
              <User className="h-6 w-6 mr-1" />
              <span className="hidden md:inline-block">
                {user?.email?.split('@')[0] || 'Account'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                <Link
                  to="/account"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User className="mr-3 h-4 w-4" />
                  {hasStoredCredentials ? 'My Account' : 'Connect Account'}
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In
          </Link>
        )}
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-50 border-b border-gray-200 dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/strategies"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Strategies
                </Link>
                <Link
                  to="/auto-trader"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Auto Trader
                </Link>
                <Link
                  to="/extension-download"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Extension
                </Link>
                <Link
                  to="/settings"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  to="/account"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {hasStoredCredentials ? 'My Account' : 'Connect Account'}
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
