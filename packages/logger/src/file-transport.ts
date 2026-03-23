import path from 'path'
import { promises as fs } from 'fs'
import type { FileTransportOptions, LogEntry, Transport } from './types'

const DEFAULT_OPTIONS: Required<FileTransportOptions> = {
  logDir: '',
  maxSize: '10m',
  maxDays: 7,
  maxFiles: 0,
  compress: true,
  fileName: 'kiosk-{date}.log',
}

function parseSizeToBytes(size: string): number {
  const match = /^(\d+)([kmg]?)$/i.exec(size.toLowerCase())
  if (!match) return 10 * 1024 * 1024
  const num = parseInt(match[1] ?? '10', 10)
  const unit = match[2] ?? 'm'
  switch (unit) {
    case 'k':
      return num * 1024
    case 'm':
      return num * 1024 * 1024
    case 'g':
      return num * 1024 * 1024 * 1024
    default:
      return num
  }
}

function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp.toISOString()
  const level = entry.level.toUpperCase().padEnd(5)
  const source = entry.source ? `[${entry.source}] ` : ''
  const data = entry.data ? ` ${JSON.stringify(entry.data)}` : ''
  return `[${timestamp}] ${level} ${source}${entry.message}${data}`
}

export class FileTransport implements Transport {
  private options: Required<FileTransportOptions>
  private electronLog: typeof import('electron-log') | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null
  private pendingQueue: LogEntry[] = []

  constructor(options: FileTransportOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const electronLogModule = await import('electron-log')
      this.electronLog = electronLogModule.default

      if (this.electronLog.transports.file) {
        const fileTransport = this.electronLog.transports.file
        fileTransport.maxSize = parseSizeToBytes(this.options.maxSize)

        if (this.options.logDir) {
          fileTransport.resolvePathFn = () => {
            const date = new Date().toISOString().split('T')[0]
            const fileName = this.options.fileName.replace('{date}', date ?? '')
            return `${this.options.logDir}/${fileName}`
          }
        }

        fileTransport.format = '{text}'
      }
    } catch {
      console.warn('[FileTransport] electron-log not available, falling back to console')
    }

    this.initialized = true

    const pending = this.pendingQueue.splice(0)
    for (const entry of pending) {
      this.writeEntry(entry)
    }

    if (this.options.maxDays > 0 || this.options.maxFiles > 0) {
      void this.cleanOldFiles()
    }
  }

  private writeEntry(entry: LogEntry): void {
    if (!this.electronLog) {
      console.log(formatLogEntry(entry))
      return
    }
    const formatted = formatLogEntry(entry)
    switch (entry.level) {
      case 'error':
        this.electronLog.error(formatted)
        break
      case 'warn':
        this.electronLog.warn(formatted)
        break
      case 'info':
        this.electronLog.info(formatted)
        break
      case 'debug':
        this.electronLog.debug(formatted)
        break
    }
  }

  private getLogDir(): string {
    if (this.options.logDir) return this.options.logDir
    if (this.electronLog?.transports.file) {
      try {
        return path.dirname(this.electronLog.transports.file.getFile().toString())
      } catch {
        return ''
      }
    }
    return ''
  }

  private async cleanOldFiles(): Promise<void> {
    const logDir = this.getLogDir()
    if (!logDir) return

    try {
      const names = await fs.readdir(logDir)
      const entries = await Promise.all(
        names
          .filter((f) => f.endsWith('.log'))
          .map(async (name) => {
            const filePath = path.join(logDir, name)
            const stat = await fs.stat(filePath)
            return { path: filePath, mtime: stat.mtime }
          }),
      )
      entries.sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // newest first

      const cutoff = this.options.maxDays > 0 ? new Date(Date.now() - this.options.maxDays * 24 * 60 * 60 * 1000) : null

      let kept = 0
      for (const { path: filePath, mtime } of entries) {
        const tooOld = cutoff !== null && mtime < cutoff
        const tooMany = this.options.maxFiles > 0 && kept >= this.options.maxFiles

        if (tooOld || tooMany) {
          await fs.unlink(filePath)
        } else {
          kept++
        }
      }
    } catch {
      // cleanup failure is non-fatal
    }
  }

  log(entry: LogEntry): void {
    if (this.initialized) {
      this.writeEntry(entry)
    } else {
      this.pendingQueue.push(entry)
      if (!this.initPromise) {
        this.initPromise = this.initialize()
      }
    }
  }

  async flush(): Promise<void> {
    // electron-log handles flushing internally
  }

  async close(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise
    }
    // electron-log handles cleanup internally
  }
}

export function createFileTransport(options?: FileTransportOptions): FileTransport {
  return new FileTransport(options)
}
