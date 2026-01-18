/**
 * Structured logging utility for the Rooted app
 *
 * Benefits:
 * - Environment-aware (debug logs only in development)
 * - Structured context for better debugging
 * - Ready for remote error tracking integration (Sentry, LogRocket, etc.)
 * - Type-safe logging
 * - Searchable logs with consistent formatting
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *
 *   logger.debug('User clicked button', { buttonId: 'submit' });
 *   logger.info('Prayer created successfully', { prayerId: prayer.id });
 *   logger.warn('Cache miss for devotionals', { groupId });
 *   logger.error('Failed to fetch prayers', error, { userId, groupId });
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  [key: string]: any;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteLogger?: RemoteLogger;
}

export interface RemoteLogger {
  captureException: (error: Error, context?: LogContext) => void;
  captureMessage: (message: string, level: LogLevel, context?: LogContext) => void;
}

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableRemote: !__DEV__, // Enable remote logging in production
      remoteLogger: undefined,
      ...config,
    };
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set remote logger (e.g., Sentry)
   */
  setRemoteLogger(remoteLogger: RemoteLogger): void {
    this.config.remoteLogger = remoteLogger;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(this.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${levelStr} ${message}${contextStr}`;
  }

  /**
   * Log to console
   */
  private logToConsole(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.config.enableConsole) return;

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case LogLevel.DEBUG:
        console.log(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  /**
   * Log to remote service
   */
  private logToRemote(level: LogLevel, message: string, error?: Error, context?: LogContext): void {
    if (!this.config.enableRemote || !this.config.remoteLogger) return;

    try {
      if (error) {
        this.config.remoteLogger.captureException(error, {
          message,
          level,
          ...context,
        });
      } else if (level === LogLevel.ERROR || level === LogLevel.WARN) {
        this.config.remoteLogger.captureMessage(message, level, context);
      }
    } catch (err) {
      // Silently fail - don't want logging to crash the app
      console.error('Failed to log to remote service:', err);
    }
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.logToConsole(LogLevel.DEBUG, message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.logToConsole(LogLevel.INFO, message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.logToConsole(LogLevel.WARN, message, context);
    this.logToRemote(LogLevel.WARN, message, undefined, context);
  }

  /**
   * Error level logging with optional Error object
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    // Convert unknown errors to Error objects
    const errorObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined;

    // Add error details to context
    const enrichedContext = errorObj
      ? {
          ...context,
          errorName: errorObj.name,
          errorMessage: errorObj.message,
          errorStack: errorObj.stack,
        }
      : context;

    this.logToConsole(LogLevel.ERROR, message, enrichedContext);
    this.logToRemote(LogLevel.ERROR, message, errorObj, context);
  }

  /**
   * Log a function call for debugging
   */
  logFunctionCall(functionName: string, args?: any[], result?: any): void {
    if (!__DEV__) return;
    this.debug(`${functionName}()`, {
      args: args ? JSON.stringify(args) : undefined,
      result: result ? JSON.stringify(result) : undefined,
    });
  }

  /**
   * Log performance timing
   */
  logTiming(label: string, startTime: number, context?: LogContext): void {
    const duration = Date.now() - startTime;
    this.info(`${label} completed`, {
      ...context,
      duration: `${duration}ms`,
    });
  }

  /**
   * Create a timer for performance measurement
   */
  startTimer(label: string): () => void {
    const startTime = Date.now();
    return () => this.logTiming(label, startTime);
  }

  /**
   * Log user action for analytics
   */
  logUserAction(action: string, context?: LogContext): void {
    this.info(`User action: ${action}`, context);
  }

  /**
   * Log API call
   */
  logApiCall(method: string, endpoint: string, status?: number, duration?: number): void {
    const level = status && status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `API ${method} ${endpoint}`;

    if (level === LogLevel.WARN) {
      this.warn(message, { status, duration: duration ? `${duration}ms` : undefined });
    } else {
      this.debug(message, { status, duration: duration ? `${duration}ms` : undefined });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
