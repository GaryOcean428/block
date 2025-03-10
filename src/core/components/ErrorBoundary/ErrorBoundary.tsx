/**
 * Error Boundary Component
 *
 * A React error boundary component that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI instead of crashing the app.
 * Enhanced with TypeScript and compatible with React 19.
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ErrorLogger } from '@utils/errorLogger';

interface ErrorBoundaryProps {
  /** Optional custom fallback component */
  fallback?: ReactNode;
  /** Children to render */
  children: ReactNode;
}

interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The error that was caught */
  error: Error | null;
}

/**
 * Error Boundary component to catch JavaScript errors in children components
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Update state when an error occurs
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log the error to our error tracking service
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to our error tracking service
    ErrorLogger.captureException(error, {
      context: errorInfo.componentStack ? errorInfo.componentStack : {},
    });
  }

  /**
   * Try to recover the app from the error state
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    // If there's an error, show fallback UI
    if (hasError) {
      // Use custom fallback if provided, otherwise use the default one
      if (fallback) {
        return fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-container">
            <div className="error-boundary-header">
              <h2>Something went wrong</h2>
              <p className="error-boundary-message">
                {error?.message ?? 'An unexpected error occurred'}
              </p>
            </div>
            <div className="error-boundary-actions">
              <button onClick={this.resetErrorBoundary} className="error-boundary-button">
                Try Again
              </button>
              <button onClick={() => window.location.reload()} className="error-boundary-button">
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Otherwise, render children normally
    return children;
  }
}

export default ErrorBoundary;
