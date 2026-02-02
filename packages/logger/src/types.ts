/**
 * Logger type definitions
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  source?: string;
}

export interface FileTransportOptions {
  /** Log file directory path */
  logDir?: string;
  /** Maximum file size before rotation (e.g., '10m', '100k') */
  maxSize?: string;
  /** Maximum number of days to keep log files */
  maxDays?: number;
  /** Whether to compress rotated files */
  compress?: boolean;
  /** Log file name format */
  fileName?: string;
}

export interface RemoteTransportOptions {
  /** Remote server URL for log upload */
  serverUrl?: string;
  /** Device ID for identification */
  deviceId?: string;
  /** Minimum log level to send remotely */
  minLevel?: LogLevel;
  /** Batch size for sending logs */
  batchSize?: number;
  /** Interval in ms to flush logs */
  flushInterval?: number;
  /** Whether remote transport is enabled */
  enabled?: boolean;
}

export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  /** File transport options */
  file?: FileTransportOptions;
  /** Remote transport options */
  remote?: RemoteTransportOptions;
  /** Logger source identifier */
  source?: string;
}

export interface Logger {
  error(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  child(source: string): Logger;
}

export interface Transport {
  log(entry: LogEntry): void;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}
