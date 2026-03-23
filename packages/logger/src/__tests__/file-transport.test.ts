import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LogEntry } from '../types'

vi.mock('electron-log', () => ({
  default: {
    transports: {
      file: {
        maxSize: 0,
        format: '',
        resolvePathFn: null as unknown,
      },
    },
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
  },
}))

const createEntry = (level: LogEntry['level'], message: string): LogEntry => ({
  level,
  message,
  timestamp: new Date(),
})

describe('FileTransport', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization deduplication', () => {
    it('should write all entries buffered before initialization completes', async () => {
      const { createFileTransport } = await import('../file-transport')
      const electronLog = (await import('electron-log')).default

      const transport = createFileTransport()

      transport.log(createEntry('info', 'first'))
      transport.log(createEntry('warn', 'second'))
      transport.log(createEntry('error', 'third'))

      await transport.close()

      expect(electronLog.info).toHaveBeenCalledWith(expect.stringContaining('first'))
      expect(electronLog.warn).toHaveBeenCalledWith(expect.stringContaining('second'))
      expect(electronLog.error).toHaveBeenCalledWith(expect.stringContaining('third'))
    })

    it('should write each entry exactly once', async () => {
      const { createFileTransport } = await import('../file-transport')
      const electronLog = (await import('electron-log')).default

      const transport = createFileTransport()

      transport.log(createEntry('info', 'msg-1'))
      transport.log(createEntry('info', 'msg-2'))
      transport.log(createEntry('info', 'msg-3'))

      await transport.close()

      expect(vi.mocked(electronLog.info)).toHaveBeenCalledTimes(3)
    })
  })

  describe('cleanOldFiles', () => {
    it('should delete log files older than maxDays', async () => {
      const { promises: fsMock } = await import('fs')
      const { createFileTransport } = await import('../file-transport')

      const now = Date.now()
      const oldMtime = new Date(now - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const recentMtime = new Date(now - 1 * 24 * 60 * 60 * 1000) // 1 day ago

      vi.mocked(fsMock.readdir).mockResolvedValue(['kiosk-old.log', 'kiosk-recent.log'] as never)
      vi.mocked(fsMock.stat).mockImplementation(async (p) =>
        String(p).includes('old') ? ({ mtime: oldMtime } as never) : ({ mtime: recentMtime } as never),
      )
      vi.mocked(fsMock.unlink).mockResolvedValue(undefined)

      const transport = createFileTransport({ logDir: '/test/logs', maxDays: 7, maxFiles: 0 })
      transport.log(createEntry('info', 'test'))
      await transport.close()

      // Wait for the fire-and-forget cleanOldFiles to settle
      await new Promise((r) => setTimeout(r, 0))

      expect(fsMock.unlink).toHaveBeenCalledWith(expect.stringContaining('old'))
      expect(fsMock.unlink).not.toHaveBeenCalledWith(expect.stringContaining('recent'))
    })

    it('should delete excess files when maxFiles is exceeded', async () => {
      const { promises: fsMock } = await import('fs')
      const { createFileTransport } = await import('../file-transport')

      const now = Date.now()
      vi.mocked(fsMock.readdir).mockResolvedValue(['file1.log', 'file2.log', 'file3.log'] as never)
      vi.mocked(fsMock.stat).mockImplementation(async (p) => {
        const name = String(p)
        if (name.includes('file1')) return { mtime: new Date(now - 3000) } as never
        if (name.includes('file2')) return { mtime: new Date(now - 2000) } as never
        return { mtime: new Date(now - 1000) } as never // file3 is newest
      })
      vi.mocked(fsMock.unlink).mockResolvedValue(undefined)

      const transport = createFileTransport({ logDir: '/test/logs', maxDays: 0, maxFiles: 2 })
      transport.log(createEntry('info', 'test'))
      await transport.close()

      await new Promise((r) => setTimeout(r, 0))

      expect(fsMock.unlink).toHaveBeenCalledWith(expect.stringContaining('file1'))
      expect(fsMock.unlink).not.toHaveBeenCalledWith(expect.stringContaining('file2'))
      expect(fsMock.unlink).not.toHaveBeenCalledWith(expect.stringContaining('file3'))
    })
  })
})
