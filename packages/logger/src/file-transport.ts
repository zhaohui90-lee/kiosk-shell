/**
 * File transport with log rotation
 * Uses electron-log for file logging with rotation support
 */

import type { FileTransportOptions, LogEntry, Transport } from './types';

// Default options
const DEFAULT_OPTIONS: Required<FileTransportOptions> = {
  logDir: '',
  maxSize: '10m',
  maxDays: 7,
  compress: true,
  fileName: 'kiosk-{date}.log',
};

/**
 * Parse size string to bytes
 * @param size - Size string (e.g., '10m', '100k', '1g')
 */
function parseSizeToBytes(size: string): number {
  const match = /^(\d+)([kmg]?)$/i.exec(size.toLowerCase());
  if (!match) {
    return 10 * 1024 * 1024; // Default 10MB
  }

  const num = parseInt(match[1] ?? '10', 10);
  const unit = match[2] ?? 'm';

  switch (unit) {
    case 'k':
      return num * 1024;
    case 'm':
      return num * 1024 * 1024;
    case 'g':
      return num * 1024 * 1024 * 1024;
    default:
      return num;
  }
}

/**
 * Format log entry to string
 */
function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp.toISOString();
  const level = entry.level.toUpperCase().padEnd(5);
  const source = entry.source ? `[${entry.source}] ` : '';
  const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';

  return `[${timestamp}] ${level} ${source}${entry.message}${data}`;
}

/**
 * File transport class for logging to files with rotation
 */
export class FileTransport implements Transport {
  private options: Required<FileTransportOptions>;
  private electronLog: typeof import('electron-log') | null = null;
  private initialized = false;

  constructor(options: FileTransportOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize electron-log (lazy loading for Node.js compatibility)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamic import for electron-log
      const electronLogModule = await import('electron-log');
      this.electronLog = electronLogModule.default;

      // Configure file transport
      if (this.electronLog.transports.file) {
        const fileTransport = this.electronLog.transports.file;

        // Set max file size
        fileTransport.maxSize = parseSizeToBytes(this.options.maxSize);

        // Set log directory if provided
        if (this.options.logDir) {
          fileTransport.resolvePathFn = () => {
            const date = new Date().toISOString().split('T')[0];
            const fileName = this.options.fileName.replace('{date}', date ?? '');
            return `${this.options.logDir}/${fileName}`;
          };
        }

        // Set log format
        fileTransport.format = '{text}';
      }

      this.initialized = true;
    } catch {
      // electron-log not available (running in pure Node.js)
      console.warn('[FileTransport] electron-log not available, falling back to console');
    }
  }

  /**
   * Log an entry to file
   */
  log(entry: LogEntry): void {
    const formatted = formatLogEntry(entry);

    // Try to use electron-log if available
    if (this.electronLog) {
      switch (entry.level) {
        case 'error':
          this.electronLog.error(formatted);
          break;
        case 'warn':
          this.electronLog.warn(formatted);
          break;
        case 'info':
          this.electronLog.info(formatted);
          break;
        case 'debug':
          this.electronLog.debug(formatted);
          break;
      }
    } else {
      // Fallback: queue for initialization or console output
      void this.initialize().then(() => {
        if (this.electronLog) {
          this.log(entry);
        } else {
          // Final fallback to console
          console.log(formatted);
        }
      });
    }
  }

  /**
   * Flush pending logs (no-op for file transport)
   */
  async flush(): Promise<void> {
    // electron-log handles flushing internally
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    // electron-log handles cleanup internally
  }
}

/**
 * Create a file transport instance
 */
export function createFileTransport(options?: FileTransportOptions): FileTransport {
  return new FileTransport(options);
}
