import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/Dashboard';
import Strategies from './pages/Strategies';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AutoTrader from './pages/AutoTrader';
import ExtensionDownload from './pages/ExtensionDownload';
import { AuthProvider } from './context/AuthContextProvider';
import { ProtectedRoute } from './components/Auth';
import './index.css';

// Catch and log render errors
try {
  // Main rendering with routing and auth protection
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/strategies"
              element={
                <ProtectedRoute>
                  <Strategies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auto-trader"
              element={
                <ProtectedRoute>
                  <AutoTrader />
                </ProtectedRoute>
              }
            />
            <Route
              path="/extension-download"
              element={
                <ExtensionDownload />
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Redirect any unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log('Application successfully rendered with routing and authentication');
} catch (error) {
  console.error('Error rendering the application:', error);
  // Display a minimal error message in case of failure
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; text-align: center;">
      <h1>Application Error</h1>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>Check the console for more details.</p>
    </div>
  `;
}
