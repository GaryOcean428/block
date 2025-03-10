/**
 * Error Logger Service
 *
 * Centralized error logging service to track and report application errors.
 * Supports multiple environments and can be configured to use different error tracking services.
 */

import { getEnvironment } from './environment';

interface ErrorLogOptions {
  /** Additional contextual information about the error */
  context?: string | Record<string, unknown>;
  /** User information if available */
  user?: {
    id?: string;
    username?: string;
    email?: string;
  };
  /** Additional tags to categorize the error */
  tags?: Record<string, string>;
  /** Severity level of the error */
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
}

/**
 * ErrorLogger service for centralized error handling
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private isInitialized = false;
  private readonly environment = getEnvironment();

  /**
   * Initialize the error logging service
   */
  static init(): void {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
      ErrorLogger.instance.initialize();
    }
  }

  /**
   * Initialize error tracking services based on environment
   */
  private initialize(): void {
    if (this.isInitialized) return;

    try {
      // In a production environment, we would initialize actual error tracking services here
      if (this.environment === 'production') {
        console.log('Initializing production error tracking');
        // Example: initSentry();
      } else if (this.environment === 'development') {
        console.log('Development error tracking initialized');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize error tracking:', error);
    }
  }

  /**
   * Capture and log an exception
   */
  static captureException(error: Error, options?: ErrorLogOptions): void {
    if (!ErrorLogger.instance) {
      ErrorLogger.init();
    }

    const { context, level = 'error' } = options || {};

    // Log to console in all environments for debugging
    console.error(`[${level.toUpperCase()}] Error captured:`, error);

    if (context) {
      console.error('Error context:', context);
    }

    // In production, we would send to error tracking service
    if (ErrorLogger.instance.environment === 'production') {
      // Example: Sentry.captureException(error, { extra: { context } });
    }
  }

  /**
   * Log a message with a specific level
   */
  static log(message: string, level: ErrorLogOptions['level'] = 'info'): void {
    if (!ErrorLogger.instance) {
      ErrorLogger.init();
    }

    // Log to console in all environments
    console.log(`[${level.toUpperCase()}] ${message}`);

    // In production, we would send to error tracking service
    if (ErrorLogger.instance.environment === 'production') {
      // Example: Sentry.captureMessage(message, level);
    }
  }

  /**
   * Set user information for error context
   */
  static setUser(user: ErrorLogOptions['user']): void {
    if (!ErrorLogger.instance) {
      ErrorLogger.init();
    }

    if (user && ErrorLogger.instance.environment === 'production') {
      // Example: Sentry.setUser(user);
    }
  }

  /**
   * Clear user information
   */
  static clearUser(): void {
    if (!ErrorLogger.instance) {
      ErrorLogger.init();
    }

    if (ErrorLogger.instance.environment === 'production') {
      // Example: Sentry.configureScope(scope => scope.setUser(null));
    }
  }
}

// Initialize error logger on import
ErrorLogger.init();
