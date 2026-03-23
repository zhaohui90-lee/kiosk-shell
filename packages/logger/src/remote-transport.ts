import { LEVEL_PRIORITY } from './types'
import { UploadQueue } from './upload-queue'
import type { LogEntry, LogLevel, RemoteTransportOptions, Transport } from './types'

const DEFAULT_OPTIONS: Required<Omit<RemoteTransportOptions, 'persistencePath'>> = {
  serverUrl: '',
  deviceId: '',
  minLevel: 'warn',
  batchSize: 50,
  flushInterval: 30000,
  enabled: true,
  maxBufferSize: 500,
}

const INITIAL_RETRY_DELAY_MS = 60000
const MAX_RETRY_DELAY_MS = 600000

export class RemoteTransport implements Transport {
  private options: Required<Omit<RemoteTransportOptions, 'persistencePath'>> & RemoteTransportOptions
  private buffer: LogEntry[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private flushPromise: Promise<void> | null = null
  private retryCount = 0
  private nextFlushAt = 0
  private queue: UploadQueue | null = null
  private restorePromise: Promise<void> | null = null

  constructor(options: RemoteTransportOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    if (this.options.persistencePath) {
      this.queue = new UploadQueue(this.options.persistencePath)
      this.restorePromise = this.restoreQueue()
    }

    if (this.options.enabled && this.options.flushInterval > 0) {
      this.startFlushTimer()
    }
  }

  private async restoreQueue(): Promise<void> {
    if (!this.queue) return
    const restored = await this.queue.restore()
    if (restored.length > 0) {
      const combined = [...restored, ...this.buffer]
      this.buffer =
        this.options.maxBufferSize > 0 ? combined.slice(0, this.options.maxBufferSize) : combined
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
    if (this.options.maxBufferSize > 0 && this.buffer.length >= this.options.maxBufferSize) return

    this.buffer.push(entry)

    if (this.buffer.length >= this.options.batchSize) {
      void this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.restorePromise) {
      await this.restorePromise
      this.restorePromise = null
    }
    if (this.flushPromise) return this.flushPromise
    if (!this.options.enabled || !this.options.serverUrl || this.buffer.length === 0) return
    if (Date.now() < this.nextFlushAt) return

    this.flushPromise = this.sendBatch().finally(() => {
      this.flushPromise = null
    })
    return this.flushPromise
  }

  private async sendBatch(): Promise<void> {
    const logsToSend = this.buffer.splice(0)

    if (this.queue) {
      await this.queue.persist(logsToSend)
    }

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
      } else {
        if (this.queue) await this.queue.clear()
        this.retryCount = 0
        this.nextFlushAt = 0
      }
    } catch (error) {
      this.requeueFailed(logsToSend)
      console.warn('[RemoteTransport] Failed to send logs:', error)
    }
  }

  private requeueFailed(failed: LogEntry[]): void {
    const combined = [...failed, ...this.buffer]
    this.buffer =
      this.options.maxBufferSize > 0 ? combined.slice(0, this.options.maxBufferSize) : combined
    this.retryCount++
    const delay = Math.min(
      INITIAL_RETRY_DELAY_MS * Math.pow(2, this.retryCount - 1),
      MAX_RETRY_DELAY_MS,
    )
    this.nextFlushAt = Date.now() + delay
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    if (this.flushPromise) {
      await this.flushPromise
    }
    // Bypass backoff on close — last chance to send remaining logs
    this.nextFlushAt = 0
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
