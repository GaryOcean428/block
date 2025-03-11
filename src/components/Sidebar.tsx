import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTradingContext } from '../hooks/useTradingContext';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../services/auth';
import {
  LayoutDashboard,
  LineChart,
  Settings,
  LogOut,
  Zap,
  BarChart4,
  Chrome,
  User,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { accountBalance, isLoading } = useTradingContext();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/strategies', label: 'Trading Strategies', icon: <LineChart size={20} /> },
    { path: '/market-analysis', label: 'Market Analysis', icon: <BarChart4 size={20} /> },
    { path: '/extension-download', label: 'Chrome Extension', icon: <Chrome size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-gray-800 text-white hidden md:block">
      <div className="p-4">
        <div className="flex items-center justify-center mb-6 mt-2">
          <Zap className="h-8 w-8 text-blue-400 mr-2" />
          <h2 className="text-xl font-bold">TradingBot</h2>
        </div>

        <nav>
          <ul>
            {navItems.map(item => (
              <li key={item.path} className="mb-1">
                <Link
                  to={item.path}
                  className={`flex items-center p-3 rounded-md transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'bg-blue-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="p-4 border-t border-gray-700 mt-auto">
        {/* Account balance info */}
        <div className="bg-gray-900 p-3 rounded-md mb-4">
          <div className="text-sm text-gray-400 mb-2">Account Balance</div>
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="text-lg font-semibold">
                ${parseFloat(accountBalance?.totalAmount || '0').toFixed(2)} USDT
              </div>
              <div
                className={`text-xs mt-1 ${parseFloat(accountBalance?.todayPnL || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {parseFloat(accountBalance?.todayPnL || '0') >= 0 ? '+' : ''}
                {parseFloat(accountBalance?.todayPnLPercentage || '0').toFixed(2)}% today
              </div>
            </>
          )}
        </div>

        {/* User info and logout */}
        <div className="flex flex-col">
          <div className="flex items-center mb-3">
            <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-2">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 truncate">
              <div className="text-sm font-medium truncate">{user?.email || 'User'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors duration-200"
          >
            <LogOut size={16} className="mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
