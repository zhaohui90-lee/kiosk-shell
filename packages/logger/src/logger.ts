/**
 * Unified logger implementation
 * Combines file and remote transports
 */

import { FileTransport, createFileTransport } from './file-transport';
import { RemoteTransport, createRemoteTransport } from './remote-transport';
import type {
  Logger,
  LoggerOptions,
  LogEntry,
  LogLevel,
  Transport,
} from './types';

// Log level priority (lower = more severe)
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Default options
const DEFAULT_OPTIONS: Required<Omit<LoggerOptions, 'file' | 'remote'>> & LoggerOptions = {
  level: 'info',
  source: 'kiosk',
};

/**
 * KioskLogger class - unified logging interface
 */
export class KioskLogger implements Logger {
  private options: Required<Omit<LoggerOptions, 'file' | 'remote'>> & LoggerOptions;
  private transports: Transport[] = [];
  private fileTransport: FileTransport | null = null;
  private remoteTransport: RemoteTransport | null = null;

  constructor(options: LoggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize file transport
    this.fileTransport = createFileTransport(this.options.file);
    this.transports.push(this.fileTransport);

    // Initialize remote transport (disabled by default)
    this.remoteTransport = createRemoteTransport(this.options.remote);
    this.transports.push(this.remoteTransport);
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.options.level];
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      ...(data !== undefined && { data }),
      source: this.options.source,
    };

    // Send to all transports
    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (error) {
        // Avoid infinite loops - only console.error for transport failures
        console.error('[Logger] Transport error:', error);
      }
    }
  }

  /**
   * Log an error message
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * Create a child logger with a specific source
   */
  child(source: string): Logger {
    const childSource = this.options.source
      ? `${this.options.source}:${source}`
      : source;

    return new KioskLogger({
      ...this.options,
      source: childSource,
    });
  }

  /**
   * Configure remote transport
   */
  configureRemote(options: LoggerOptions['remote']): void {
    if (this.remoteTransport && options) {
      this.remoteTransport.configure(options);
    }
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map(async (transport) => {
        if (transport.flush) {
          await transport.flush();
        }
      })
    );
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    await Promise.all(
      this.transports.map(async (transport) => {
        if (transport.close) {
          await transport.close();
        }
      })
    );
  }

  /**
   * Get the file transport instance
   */
  getFileTransport(): FileTransport | null {
    return this.fileTransport;
  }

  /**
   * Get the remote transport instance
   */
  getRemoteTransport(): RemoteTransport | null {
    return this.remoteTransport;
  }
}

/**
 * Create a logger instance
 */
export function createLogger(options?: LoggerOptions): KioskLogger {
  return new KioskLogger(options);
}

// Default logger instance (singleton)
let defaultLogger: KioskLogger | null = null;

/**
 * Get the default logger instance
 */
export function getLogger(): KioskLogger {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

/**
 * Initialize the default logger with custom options
 */
export function initLogger(options: LoggerOptions): KioskLogger {
  defaultLogger = createLogger(options);
  return defaultLogger;
}
