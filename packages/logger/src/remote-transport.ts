import type { LogEntry, LogLevel, RemoteTransportOptions, Transport } from './types'

const DEFAULT_OPTIONS: Required<RemoteTransportOptions> = {
  serverUrl: '',
  deviceId: '',
  minLevel: 'warn',
  batchSize: 50,
  flushInterval: 30000,
  enabled: false,
  maxBufferSize: 500,
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

export class RemoteTransport implements Transport {
  private options: Required<RemoteTransportOptions>
  private buffer: LogEntry[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private flushPromise: Promise<void> | null = null

  constructor(options: RemoteTransportOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    if (this.options.enabled && this.options.flushInterval > 0) {
      this.startFlushTimer()
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer)
    this.flushTimer = setInterval(() => {
      void this.flush()
    }, this.options.flushInterval)
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.options.minLevel]
  }

  log(entry: LogEntry): void {
    if (!this.options.enabled || !this.options.serverUrl) return
    if (!this.shouldLog(entry.level)) return
    if (this.buffer.length >= this.options.maxBufferSize) return

    this.buffer.push(entry)

    if (this.buffer.length >= this.options.batchSize) {
      void this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.flushPromise) return this.flushPromise
    if (!this.options.enabled || !this.options.serverUrl || this.buffer.length === 0) return

    this.flushPromise = this.sendBatch().finally(() => {
      this.flushPromise = null
    })
    return this.flushPromise
  }

  private async sendBatch(): Promise<void> {
    const logsToSend = this.buffer.splice(0)

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
      }

      const response = await fetch(this.options.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        this.requeueFailed(logsToSend)
        console.warn(`[RemoteTransport] Failed to send logs: ${response.status}`)
      }
    } catch (error) {
      this.requeueFailed(logsToSend)
      console.warn('[RemoteTransport] Failed to send logs:', error)
    }
  }

  private requeueFailed(failed: LogEntry[]): void {
    const combined = [...failed, ...this.buffer]
    this.buffer = combined.slice(0, this.options.maxBufferSize)
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    if (this.flushPromise) {
      await this.flushPromise
    }
    await this.flush()
  }

  configure(options: Partial<RemoteTransportOptions>): void {
    const wasEnabled = this.options.enabled
    const oldInterval = this.options.flushInterval
    this.options = { ...this.options, ...options }

    const shouldHaveTimer = this.options.enabled && this.options.flushInterval > 0
    const intervalChanged = this.options.flushInterval !== oldInterval

    if (shouldHaveTimer && (!wasEnabled || intervalChanged)) {
      this.startFlushTimer()
    } else if (!shouldHaveTimer && this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  getBufferSize(): number {
    return this.buffer.length
  }
}

export function createRemoteTransport(options?: RemoteTransportOptions): RemoteTransport {
  return new RemoteTransport(options)
}
