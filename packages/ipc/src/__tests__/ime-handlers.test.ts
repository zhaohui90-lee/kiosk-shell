import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '../types'

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}))

vi.mock('@kiosk/logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

const mockRimeResult = {
  state: 1 as const,
  head: '',
  body: 'ni',
  tail: '',
  page: 0,
  isLastPage: true,
  highlighted: 0,
  candidates: [{ text: '你' }],
}

vi.mock('@kiosk/plugin-rime', () => ({
  setIME: vi.fn().mockResolvedValue(undefined),
  process: vi.fn().mockResolvedValue(mockRimeResult),
  selectCandidateOnCurrentPage: vi.fn().mockResolvedValue('你'),
  changePage: vi.fn().mockResolvedValue('next-page'),
  setOption: vi.fn().mockResolvedValue(undefined),
  setPageSize: vi.fn().mockResolvedValue(undefined),
  deploy: vi.fn().mockResolvedValue(undefined),
  resetUserDirectory: vi.fn().mockResolvedValue(undefined),
}))

describe('IME Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers and unregisters IME channels', async () => {
    const { ipcMain } = await import('electron')
    const { registerImeHandlers, unregisterImeHandlers } = await import('../handlers/ime')

    registerImeHandlers()

    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.IME_SET_SCHEMA, expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.IME_PROCESS_INPUT, expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.IME_SELECT_CANDIDATE, expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.IME_CHANGE_PAGE, expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.IME_SET_OPTION, expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.IME_SET_PAGE_SIZE, expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.IME_DEPLOY, expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.IME_RESET, expect.any(Function))

    unregisterImeHandlers()

    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.IME_SET_SCHEMA)
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.IME_PROCESS_INPUT)
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.IME_SELECT_CANDIDATE)
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.IME_CHANGE_PAGE)
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.IME_SET_OPTION)
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.IME_SET_PAGE_SIZE)
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.IME_DEPLOY)
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.IME_RESET)
  })

  it('processes input through rime engine', async () => {
    const { process } = await import('@kiosk/plugin-rime')
    ;(process as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockRimeResult)
    const { handleImeProcessInput } = await import('../handlers/ime')

    const result = await handleImeProcessInput({} as Electron.IpcMainInvokeEvent, 'ni')

    expect(result).toEqual(mockRimeResult)
    expect(process).toHaveBeenCalledWith('ni')
  })

  it('validates schema argument', async () => {
    const { handleImeSetSchema } = await import('../handlers/ime')

    const result = await handleImeSetSchema({} as Electron.IpcMainInvokeEvent, '')

    expect(result).toEqual({
      success: false,
      message: 'schemaId is required',
    })
  })

  it('validates page size argument', async () => {
    const { handleImeSetPageSize } = await import('../handlers/ime')

    const result = await handleImeSetPageSize({} as Electron.IpcMainInvokeEvent, 0)

    expect(result).toEqual({
      success: false,
      message: 'size must be a positive integer',
    })
  })

  it('sets option and handles engine failures', async () => {
    const { setOption } = await import('@kiosk/plugin-rime')
    const { handleImeSetOption } = await import('../handlers/ime')

    const ok = await handleImeSetOption({} as Electron.IpcMainInvokeEvent, 'ascii_mode', true)
    expect(ok.success).toBe(true)
    expect(setOption).toHaveBeenCalledWith('ascii_mode', true)

    ;(setOption as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('set option failed'))
    const failed = await handleImeSetOption({} as Electron.IpcMainInvokeEvent, 'ascii_mode', false)
    expect(failed).toEqual({
      success: false,
      message: 'set option failed',
    })
  })
})
