/**
 * Remote transport for sending logs to a remote server
 * Batches logs and sends them periodically or when batch is full
 */

import type { LogEntry, LogLevel, RemoteTransportOptions, Transport } from './types';

// Default options
const DEFAULT_OPTIONS: Required<RemoteTransportOptions> = {
  serverUrl: '',
  deviceId: '',
  minLevel: 'warn',
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
  enabled: false,
};

// Log level priority (lower = more severe)
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Remote transport class for sending logs to a remote server
 */
export class RemoteTransport implements Transport {
  private options: Required<RemoteTransportOptions>;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(options: RemoteTransportOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Start flush timer if enabled and interval is set
    if (this.options.enabled && this.options.flushInterval > 0) {
      this.startFlushTimer();
    }
  }

  /**
   * Start the periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.options.flushInterval);
  }

  /**
   * Check if a log level meets the minimum threshold
   */
  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.options.minLevel];
  }

  /**
   * Log an entry (buffers for batch sending)
   */
  log(entry: LogEntry): void {
    // Check if remote transport is enabled
    if (!this.options.enabled || !this.options.serverUrl) {
      return;
    }

    // Check if log level meets minimum threshold
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Add to buffer
    this.buffer.push(entry);

    // Flush if batch size reached
    if (this.buffer.length >= this.options.batchSize) {
      void this.flush();
    }
  }

  /**
   * Flush buffered logs to remote server
   */
  async flush(): Promise<void> {
    // Skip if already flushing, disabled, or no logs
    if (this.isFlushing || !this.options.enabled || this.buffer.length === 0) {
      return;
    }

    // Skip if no server URL configured
    if (!this.options.serverUrl) {
      return;
    }

    this.isFlushing = true;

    // Take current buffer and clear it
    const logsToSend = [...this.buffer];
    this.buffer = [];

    try {
      const payload = {
        deviceId: this.options.deviceId,
        logs: logsToSend.map((entry) => ({
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp.toISOString(),
          data: entry.data,
          source: entry.source,
        })),
        sentAt: new Date().toISOString(),
      };

      const response = await fetch(this.options.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Put logs back in buffer for retry
        this.buffer = [...logsToSend, ...this.buffer];
        console.warn(`[RemoteTransport] Failed to send logs: ${response.status}`);
      }
    } catch (error) {
      // Put logs back in buffer for retry
      this.buffer = [...logsToSend, ...this.buffer];
      console.warn('[RemoteTransport] Failed to send logs:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Close the transport and flush remaining logs
   */
  async close(): Promise<void> {
    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining logs
    await this.flush();
  }

  /**
   * Update transport options
   */
  configure(options: Partial<RemoteTransportOptions>): void {
    const wasEnabled = this.options.enabled;
    this.options = { ...this.options, ...options };

    // Handle timer based on enabled state
    if (this.options.enabled && !wasEnabled && this.options.flushInterval > 0) {
      this.startFlushTimer();
    } else if (!this.options.enabled && wasEnabled && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

/**
 * Create a remote transport instance
 */
export function createRemoteTransport(options?: RemoteTransportOptions): RemoteTransport {
  return new RemoteTransport(options);
}
