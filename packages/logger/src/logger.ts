/**
 * Unified logger implementation
 * Combines file and remote transports
 */

import { FileTransport, createFileTransport } from './file-transport'
import { RemoteTransport, createRemoteTransport } from './remote-transport'
import { LEVEL_PRIORITY } from './types'
import type { Logger, LoggerOptions, LogEntry, LogLevel, Transport } from './types'

/** LoggerOptions with required base fields (level, source) but optional transport configs */
type ResolvedLoggerOptions = Required<Omit<LoggerOptions, 'file' | 'remote'>> & LoggerOptions

const DEFAULT_OPTIONS: ResolvedLoggerOptions = {
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  source: 'kiosk-shell',
}

/**
 * KioskLogger class - unified logging interface
 */
interface SharedTransports {
  file: FileTransport | null
  remote: RemoteTransport | null
}

export class KioskLogger implements Logger {
  private options: ResolvedLoggerOptions
  private transports: Transport[] = []
  private fileTransport: FileTransport | null = null
  private remoteTransport: RemoteTransport | null = null
  private ownsTransports: boolean

  constructor(options: LoggerOptions = {}, shared?: SharedTransports) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.ownsTransports = !shared

    if (shared) {
      this.fileTransport = shared.file
      this.remoteTransport = shared.remote
    } else {
      this.fileTransport = createFileTransport(this.options.file)
      this.remoteTransport = createRemoteTransport(this.options.remote)
    }

    if (this.fileTransport) this.transports.push(this.fileTransport)
    if (this.remoteTransport) this.transports.push(this.remoteTransport)
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.options.level]
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      ...(data !== undefined && { data }),
      source: this.options.source,
    }

    // Send to all transports
    for (const transport of this.transports) {
      try {
        transport.log(entry)
      } catch (error) {
        // Avoid infinite loops - only console.error for transport failures
        console.error('[Logger] Transport error:', error)
      }
    }
  }

  /**
   * Log an error message
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data)
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data)
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data)
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data)
  }

  /**
   * Create a child logger with a specific source
   */
  child(source: string): Logger {
    const childSource = this.options.source ? `${this.options.source}:${source}` : source
    return new KioskLogger(
      { ...this.options, source: childSource },
      { file: this.fileTransport, remote: this.remoteTransport },
    )
  }

  /**
   * Configure remote transport
   */
  configureRemote(options: LoggerOptions['remote']): void {
    if (this.remoteTransport && options) {
      this.remoteTransport.configure(options)
    }
  }

  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map(async (transport) => {
        if (transport.flush) {
          await transport.flush()
        }
      }),
    )
  }

  async close(): Promise<void> {
    if (!this.ownsTransports) return
    await Promise.all(
      this.transports.map(async (transport) => {
        if (transport.close) {
          await transport.close()
        }
      }),
    )
  }

  /**
   * Get the file transport instance
   */
  getFileTransport(): FileTransport | null {
    return this.fileTransport
  }

  /**
   * Get the remote transport instance
   */
  getRemoteTransport(): RemoteTransport | null {
    return this.remoteTransport
  }
}

/**
 * Create a logger instance
 */
export function createLogger(options?: LoggerOptions): KioskLogger {
  return new KioskLogger(options)
}

// Default logger instance (singleton)
let defaultLogger: KioskLogger | null = null

/**
 * Get the default logger instance
 */
export function getLogger(options?: LoggerOptions): KioskLogger {
  if (!defaultLogger) {
    defaultLogger = createLogger(options)
  } else if (options !== undefined) {
    console.warn('[Logger] getLogger() options ignored — singleton already initialised. Call getLogger() with options only once, at startup.')
  }
  return defaultLogger
}
