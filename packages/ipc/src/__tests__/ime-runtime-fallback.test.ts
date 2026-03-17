import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('IME Handler Runtime Fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns state=3 when rime runtime cannot be loaded', async () => {
    vi.doMock('electron', () => ({
      ipcMain: {
        handle: vi.fn(),
        removeHandler: vi.fn(),
      },
    }))

    vi.doMock('@kiosk/logger', () => ({
      getLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
    }))

    vi.doMock('@kiosk/plugin-rime', () => ({
      get setIME() {
        throw new Error('Worker is not defined')
      },
      process: vi.fn(),
      selectCandidateOnCurrentPage: vi.fn(),
      changePage: vi.fn(),
      setOption: vi.fn(),
      setPageSize: vi.fn(),
      deploy: vi.fn(),
      resetUserDirectory: vi.fn(),
    }))

    const { handleImeProcessInput } = await import('../handlers/ime')
    const result = await handleImeProcessInput({} as Electron.IpcMainInvokeEvent, 'ni')

    expect(result).toEqual({ state: 3 })
  })

  it('returns structured failure when schema switch fails to load runtime', async () => {
    vi.doMock('electron', () => ({
      ipcMain: {
        handle: vi.fn(),
        removeHandler: vi.fn(),
      },
    }))

    vi.doMock('@kiosk/logger', () => ({
      getLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
    }))

    vi.doMock('@kiosk/plugin-rime', () => ({
      get setIME() {
        throw new Error('Worker is not defined')
      },
      process: vi.fn(),
      selectCandidateOnCurrentPage: vi.fn(),
      changePage: vi.fn(),
      setOption: vi.fn(),
      setPageSize: vi.fn(),
      deploy: vi.fn(),
      resetUserDirectory: vi.fn(),
    }))

    const { handleImeSetSchema } = await import('../handlers/ime')
    const result = await handleImeSetSchema({} as Electron.IpcMainInvokeEvent, 'luna_pinyin')

    expect(result.success).toBe(false)
    expect(result.message).toContain('Worker is not defined')
  })
})
