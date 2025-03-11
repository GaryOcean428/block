import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import './App.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import PriceChart from './components/charts/PriceChart';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import { 
  BarChart2, 
  TrendingUp, 
  Zap, 
  Repeat, 
  Shield, 
  Globe, 
  Download,
  ArrowRight
} from 'lucide-react';
import { MarketData } from './types';

// Generate mock market data for testing
const generateMockMarketData = (count = 20): MarketData[] => {
  const startPrice = 45000;
  const startTime = Date.now() - count * 60000; // minutes ago

  return Array.from({ length: count }).map((_, index) => {
    const timestamp = startTime + index * 60000;
    const volatility = Math.random() * 100 - 50; // random price movement
    const open = startPrice + index * 10 + volatility;
    const high = open + Math.random() * 50;
    const low = open - Math.random() * 50;
    const close = (open + high + low) / 3 + (Math.random() * 20 - 10);
    const volume = 10000 + Math.random() * 5000;

    return {
      pair: 'BTC-USDT',
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    };
  });
};

// Feature card component
const FeatureCard: React.FC<{ 
  icon: React.ReactNode, 
  title: string, 
  description: string 
}> = ({ icon, title, description }) => {
  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
          {icon}
        </div>
        <h3 className="ml-4 text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
};

// Landing page component
const Landing: React.FC = () => {
  const [marketData] = useState<MarketData[]>(generateMockMarketData(50));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      {/* Hero section */}
      <div className="relative bg-blue-600 dark:bg-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="md:flex md:items-center md:space-x-10">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Algorithmic Trading Made Simple
              </h1>
              <p className="text-lg md:text-xl text-blue-100 mb-8">
                Build, test, and deploy automated trading strategies without writing code. Connect to exchanges and trade with confidence.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link 
                  to="/extension-download" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-blue-300 text-base font-medium rounded-md shadow-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Extension
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 rounded-xl overflow-hidden shadow-xl">
              <ErrorBoundary fallback={<p className="text-center py-12 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Chart preview unavailable</p>}>
                <div className="h-64 md:h-80 bg-gray-800 border border-gray-700">
                  {marketData.length > 0 && <PriceChart data={marketData} pair="BTC-USDT" />}
                </div>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Advanced Trading Features
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-300 mx-auto">
            Everything you need to build, test, and deploy algorithmic trading strategies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<BarChart2 className="h-6 w-6 text-blue-600" />} 
            title="Market Analysis" 
            description="Real-time charts, indicators, and market data. Analyze trends and identify trading opportunities."
          />
          <FeatureCard 
            icon={<TrendingUp className="h-6 w-6 text-blue-600" />} 
            title="Strategy Builder" 
            description="Create custom trading strategies using a visual interface. No coding required."
          />
          <FeatureCard 
            icon={<Repeat className="h-6 w-6 text-blue-600" />} 
            title="Backtesting" 
            description="Test your strategies against historical data. Optimize parameters for better performance."
          />
          <FeatureCard 
            icon={<Zap className="h-6 w-6 text-blue-600" />} 
            title="Automated Trading" 
            description="Execute trades automatically based on your strategies. Set limits and take control."
          />
          <FeatureCard 
            icon={<Shield className="h-6 w-6 text-blue-600" />} 
            title="Secure API Management" 
            description="Connect to exchanges using encrypted API keys. Your credentials never leave your device."
          />
          <FeatureCard 
            icon={<Globe className="h-6 w-6 text-blue-600" />} 
            title="Browser Extension" 
            description="Extend your trading platform to popular exchanges with our Chrome extension."
          />
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-blue-600 dark:bg-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to start trading?
          </h2>
          <p className="mt-4 text-xl text-blue-100 mx-auto max-w-2xl">
            Create an account to get started with advanced trading tools and strategies.
          </p>
          <Link 
            to="/login" 
            className="mt-8 inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:justify-start">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-blue-600 mr-2" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Block Trader</span>
              </div>
            </div>
            <div className="mt-8 md:mt-0">
              <p className="text-center md:text-right text-base text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} Block Trader. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Main app component that wraps with ErrorBoundary
function App() {
  const { isAuthenticated, loading } = useAuth();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h2>
          <p className="text-gray-700 dark:text-gray-300">
            The application encountered an error. Please refresh the page or contact support.
          </p>
        </div>
      }
    >
      <Landing />
    </ErrorBoundary>
  );
}

export default App;