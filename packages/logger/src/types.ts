/**
 * Logger type definitions
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  data?: Record<string, unknown>
  source?: string
}

export interface FileTransportOptions {
  /** Log file directory path */
  logDir?: string
  /** Maximum file size before rotation (e.g., '10m', '100k') */
  maxSize?: string
  /** Maximum number of days to keep log files */
  maxDays?: number
  /** Maximum number of log files to keep (0 = unlimited) */
  maxFiles?: number
  /** Log file name format */
  fileName?: string
}

export interface RemoteTransportOptions {
  /** Remote server URL for log upload */
  serverUrl?: string
  /** Device ID for identification */
  deviceId?: string
  /** Minimum log level to send remotely */
  minLevel?: LogLevel
  /** Batch size for sending logs */
  batchSize?: number
  /** Interval in ms to flush logs */
  flushInterval?: number
  /** Whether remote transport is enabled */
  enabled?: boolean
  /** Maximum number of entries to keep in buffer (0 = unlimited) */
  maxBufferSize?: number
  /** File path to persist upload queue for crash recovery */
  persistencePath?: string
}

export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel
  /** File transport options */
  file?: FileTransportOptions
  /** Remote transport options */
  remote?: RemoteTransportOptions
  /** Logger source identifier */
  source?: string
}

export interface Logger {
  error(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  debug(message: string, data?: Record<string, unknown>): void
  child(source: string): Logger
}

export interface Transport {
  log(entry: LogEntry): void
  flush?(): Promise<void>
  close?(): Promise<void>
}
