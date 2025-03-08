/**
 * Modern React 19 Error Boundary using Error Boundary API
 * Provides fallback UI and error reporting
 */
import React, { ReactNode, Component } from 'react';
import { serializeError } from '@core/utils/errors';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Store error info in state for rendering
    this.setState({ errorInfo });

    // Example of logging to an error service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo): void {
    // Here you would normally send this to your error tracking service
    // For example, Sentry, LogRocket, etc.
    const errorData = {
      ...serializeError(error),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    // Store in local storage for debugging until we have a proper service
    try {
      const errors = JSON.parse(localStorage.getItem('error_logs') || '[]');
      errors.push(errorData);
      // Limit to 10 most recent errors
      localStorage.setItem('error_logs', JSON.stringify(errors.slice(-10)));
    } catch (e) {
      console.error('Failed to log error to localStorage', e);
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({ error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      // Allow for both functional and component fallbacks
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetErrorBoundary);
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary-container p-6 mx-auto my-8 max-w-2xl bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Something went wrong</h2>
          <div className="mb-4 text-gray-700">
            <p>
              The application encountered an unexpected error. Try refreshing the page or contact
              support if the problem persists.
            </p>
          </div>
          <details className="mt-4 mb-4">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              Technical Details
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded overflow-auto text-xs whitespace-pre-wrap">
              {this.state.error.toString()}
              {this.state.errorInfo && (
                <div className="mt-2">{this.state.errorInfo.componentStack}</div>
              )}
            </pre>
          </details>
          <button
            onClick={this.resetErrorBoundary}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Try Again
          </button>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

/**
 * Convenient hook-based error boundary for use within components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
): React.ComponentType<P> {
  const displayName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;

  return WrappedComponent;
}
