import React from 'react';
import { Menu, User, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const SimpleNavbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 flex justify-between items-center">
      <div className="flex items-center">
        <button className="mr-2 md:hidden">
          <Menu className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Trading Platform</h1>
      </div>

      <div className="flex items-center space-x-4">
        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <Bell className="h-6 w-6" />
        </button>

        <div className="flex items-center">
          <Link
            to="/settings"
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <User className="h-6 w-6 mr-1" />
            <span className="hidden md:inline-block">{user?.email || 'Account'}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default SimpleNavbar;
