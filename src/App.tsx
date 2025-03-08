import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryProvider } from '@core/providers/QueryProvider';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { ErrorBoundary } from '@core/components/ErrorBoundary';
import Integration from './components/Integration';
import { ROUTES } from '@config/constants';
import './App.css';
import { TradingProvider } from './context/TradingContext';

// Use lazy loading for route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Strategies = lazy(() => import('./pages/Strategies'));
const MarketAnalysis = lazy(() => import('./pages/MarketAnalysis'));
const Account = lazy(() => import('./pages/Account'));
const Settings = lazy(() => import('./pages/Settings'));
const ExtensionDownload = lazy(() => import('./pages/ExtensionDownload'));

// Create a loading component for suspense fallback
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-full w-full">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <TradingProvider>
          <Router>
            <div className="flex h-screen bg-neutral-100">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-100 p-4">
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
                      <Route path={ROUTES.STRATEGIES} element={<Strategies />} />
                      <Route path={ROUTES.MARKET_ANALYSIS} element={<MarketAnalysis />} />
                      <Route path={ROUTES.ACCOUNT} element={<Account />} />
                      <Route path={ROUTES.SETTINGS} element={<Settings />} />
                      <Route path={ROUTES.EXTENSION} element={<ExtensionDownload />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>
            </div>
            <Integration />
          </Router>
        </TradingProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
