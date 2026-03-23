import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LogEntry } from '../types'

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}))

const createEntry = (level: LogEntry['level'] = 'error', message = 'test'): LogEntry => ({
  level,
  message,
  timestamp: new Date('2026-03-23T10:00:00.000Z'),
  source: 'test',
})

describe('UploadQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('persist', () => {
    it('should write entries as JSON to the queue file', async () => {
      const { promises: fsMock } = await import('fs')
      const { UploadQueue } = await import('../upload-queue')
      vi.mocked(fsMock.writeFile).mockResolvedValue(undefined)

      const queue = new UploadQueue('/tmp/queue.json')
      await queue.persist([createEntry('warn', 'hello')])

      expect(fsMock.writeFile).toHaveBeenCalledWith(
        '/tmp/queue.json',
        expect.stringContaining('"warn"'),
        'utf-8',
      )
    })

    it('should clear the file when given an empty array', async () => {
      const { promises: fsMock } = await import('fs')
      const { UploadQueue } = await import('../upload-queue')
      vi.mocked(fsMock.unlink).mockResolvedValue(undefined)

      const queue = new UploadQueue('/tmp/queue.json')
      await queue.persist([])

      expect(fsMock.writeFile).not.toHaveBeenCalled()
      expect(fsMock.unlink).toHaveBeenCalledWith('/tmp/queue.json')
    })
  })

  describe('restore', () => {
    it('should return entries from the queue file', async () => {
      const { promises: fsMock } = await import('fs')
      const { UploadQueue } = await import('../upload-queue')

      const persisted = [
        { level: 'error', message: 'crash', timestamp: '2026-03-23T10:00:00.000Z', source: 'app' },
      ]
      vi.mocked(fsMock.readFile).mockResolvedValue(JSON.stringify(persisted) as never)

      const queue = new UploadQueue('/tmp/queue.json')
      const entries = await queue.restore()

      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({ level: 'error', message: 'crash', source: 'app' })
      expect(entries[0]?.timestamp).toBeInstanceOf(Date)
    })

    it('should return an empty array when the file does not exist', async () => {
      const { promises: fsMock } = await import('fs')
      const { UploadQueue } = await import('../upload-queue')
      vi.mocked(fsMock.readFile).mockRejectedValue(new Error('ENOENT'))

      const queue = new UploadQueue('/tmp/queue.json')
      const entries = await queue.restore()

      expect(entries).toEqual([])
    })

    it('should return an empty array when the file contains invalid JSON', async () => {
      const { promises: fsMock } = await import('fs')
      const { UploadQueue } = await import('../upload-queue')
      vi.mocked(fsMock.readFile).mockResolvedValue('not-valid-json' as never)

      const queue = new UploadQueue('/tmp/queue.json')
      const entries = await queue.restore()

      expect(entries).toEqual([])
    })
  })

  describe('clear', () => {
    it('should delete the queue file', async () => {
      const { promises: fsMock } = await import('fs')
      const { UploadQueue } = await import('../upload-queue')
      vi.mocked(fsMock.unlink).mockResolvedValue(undefined)

      const queue = new UploadQueue('/tmp/queue.json')
      await queue.clear()

      expect(fsMock.unlink).toHaveBeenCalledWith('/tmp/queue.json')
    })

    it('should not throw when the file does not exist', async () => {
      const { promises: fsMock } = await import('fs')
      const { UploadQueue } = await import('../upload-queue')
      vi.mocked(fsMock.unlink).mockRejectedValue(new Error('ENOENT'))

      const queue = new UploadQueue('/tmp/queue.json')
      await expect(queue.clear()).resolves.toBeUndefined()
    })
  })

  describe('RemoteTransport integration', () => {
    it('should restore persisted entries on startup', async () => {
      const { promises: fsMock } = await import('fs')
      const { createRemoteTransport } = await import('../remote-transport')
      vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }))
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const persisted = [
        { level: 'error', message: 'pre-crash log', timestamp: '2026-03-23T10:00:00.000Z' },
      ]
      vi.mocked(fsMock.readFile).mockResolvedValue(JSON.stringify(persisted) as never)
      vi.mocked(fsMock.writeFile).mockResolvedValue(undefined)
      vi.mocked(fsMock.unlink).mockResolvedValue(undefined)

      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        persistencePath: '/tmp/queue.json',
        flushInterval: 0,
      })

      await transport.flush()

      expect(transport.getBufferSize()).toBe(0)
      expect(fsMock.unlink).toHaveBeenCalledWith('/tmp/queue.json')
    })

    it('should persist buffer before upload attempt', async () => {
      const { promises: fsMock } = await import('fs')
      const { createRemoteTransport } = await import('../remote-transport')
      vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }))
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      vi.mocked(fsMock.readFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fsMock.writeFile).mockResolvedValue(undefined)
      vi.mocked(fsMock.unlink).mockResolvedValue(undefined)

      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        persistencePath: '/tmp/queue.json',
        flushInterval: 0,
      })

      transport.log({ level: 'error', message: 'test', timestamp: new Date() })
      await transport.flush()

      expect(fsMock.writeFile).toHaveBeenCalledWith(
        '/tmp/queue.json',
        expect.stringContaining('"test"'),
        'utf-8',
      )
    })
  })
})
