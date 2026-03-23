import { promises as fs } from 'fs'
import type { LogEntry } from './types'

interface PersistedEntry {
  level: LogEntry['level']
  message: string
  timestamp: string
  data?: Record<string, unknown>
  source?: string
}

export class UploadQueue {
  constructor(private readonly filePath: string) {}

  async persist(entries: LogEntry[]): Promise<void> {
    if (entries.length === 0) {
      return this.clear()
    }
    const data: PersistedEntry[] = entries.map((e) => ({
      level: e.level,
      message: e.message,
      timestamp: e.timestamp.toISOString(),
      ...(e.data !== undefined && { data: e.data }),
      ...(e.source !== undefined && { source: e.source }),
    }))
    await fs.writeFile(this.filePath, JSON.stringify(data), 'utf-8')
  }

  async restore(): Promise<LogEntry[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return (parsed as PersistedEntry[]).map((e) => ({
        level: e.level,
        message: e.message,
        timestamp: new Date(e.timestamp),
        ...(e.data !== undefined && { data: e.data }),
        ...(e.source !== undefined && { source: e.source }),
      }))
    } catch {
      return []
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.filePath)
    } catch {
      // file may not exist
    }
  }
}
