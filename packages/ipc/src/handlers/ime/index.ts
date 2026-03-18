import { ipcMain } from 'electron'
import { getLogger } from '@kiosk/logger'
import { IPC_CHANNELS } from '../../types'
import type { ImeOperationResult, ImeConfig } from '../../types'
import type { RIME_RESULT } from '@kiosk/shared'

const logger = getLogger()

type ImeApi = {
  setIME: (schemaId: string) => Promise<void>
  process: (input: string) => Promise<RIME_RESULT>
  selectCandidateOnCurrentPage: (index: number) => Promise<string>
  changePage: (backward: boolean) => Promise<string>
  setOption: (option: string, value: boolean) => Promise<void>
  setPageSize: (size: number) => Promise<void>
  deploy: () => Promise<void>
  resetUserDirectory: () => Promise<void>
}

let imeApiPromise: Promise<ImeApi> | null = null

const DEFAULT_IME_CONFIG: ImeConfig = {
  defaultSchema: 'luna_pinyin',
  candidatePageSize: 5,
  hideDelayMs: 160,
}

let imeConfig: ImeConfig = { ...DEFAULT_IME_CONFIG }

export function setImeConfig(config: Partial<ImeConfig>): void {
  imeConfig = {
    defaultSchema: config.defaultSchema ?? DEFAULT_IME_CONFIG.defaultSchema,
    candidatePageSize: config.candidatePageSize ?? DEFAULT_IME_CONFIG.candidatePageSize,
    hideDelayMs: config.hideDelayMs ?? DEFAULT_IME_CONFIG.hideDelayMs,
  }
}

function handleImeGetConfig(): ImeConfig {
  return imeConfig
}

async function getImeApi(): Promise<ImeApi> {
  if (imeApiPromise) {
    return imeApiPromise
  }

  imeApiPromise = import('@kiosk/plugin-rime')
    .then((mod) => ({
      setIME: mod.setIME,
      process: mod.process,
      selectCandidateOnCurrentPage: mod.selectCandidateOnCurrentPage,
      changePage: mod.changePage,
      setOption: mod.setOption,
      setPageSize: mod.setPageSize,
      deploy: mod.deploy,
      resetUserDirectory: mod.resetUserDirectory,
    }))
    .catch((error) => {
      imeApiPromise = null
      throw error
    })

  return imeApiPromise
}

function success(message: string): ImeOperationResult {
  return { success: true, message }
}

function failure(error: unknown, prefix: string): ImeOperationResult {
  const err = error as Error
  logger.error(prefix, { error: err.message })
  return {
    success: false,
    message: err.message,
  }
}

async function handleImeSetSchema(
  _event: Electron.IpcMainInvokeEvent,
  schemaId: string,
): Promise<ImeOperationResult> {
  if (!schemaId) {
    return { success: false, message: 'schemaId is required' }
  }

  try {
    const imeApi = await getImeApi()
    await imeApi.setIME(schemaId)
    return success('IME schema updated')
  } catch (error) {
    return failure(error, '[IPC:IME] Failed to set schema')
  }
}

async function handleImeProcessInput(
  _event: Electron.IpcMainInvokeEvent,
  input: string,
): Promise<RIME_RESULT> {
  try {
    const imeApi = await getImeApi()
    return imeApi.process(input)
  } catch (error) {
    logger.error('[IPC:IME] Failed to process input', { error: (error as Error).message })
    return { state: 3 }
  }
}

async function handleImeSelectCandidate(
  _event: Electron.IpcMainInvokeEvent,
  index: number,
): Promise<string | null> {
  if (!Number.isInteger(index) || index < 0) {
    return null
  }
  try {
    const imeApi = await getImeApi()
    return imeApi.selectCandidateOnCurrentPage(index)
  } catch (error) {
    logger.error('[IPC:IME] Failed to select candidate', { error: (error as Error).message })
    return null
  }
}

async function handleImeChangePage(
  _event: Electron.IpcMainInvokeEvent,
  backward: boolean,
): Promise<string> {
  try {
    const imeApi = await getImeApi()
    return imeApi.changePage(backward)
  } catch (error) {
    logger.error('[IPC:IME] Failed to change page', { error: (error as Error).message })
    return ''
  }
}

async function handleImeSetOption(
  _event: Electron.IpcMainInvokeEvent,
  option: string,
  value: boolean,
): Promise<ImeOperationResult> {
  if (!option) {
    return { success: false, message: 'option is required' }
  }

  try {
    const imeApi = await getImeApi()
    await imeApi.setOption(option, value)
    return success(`Option "${option}" updated`)
  } catch (error) {
    return failure(error, '[IPC:IME] Failed to set option')
  }
}

async function handleImeSetPageSize(
  _event: Electron.IpcMainInvokeEvent,
  size: number,
): Promise<ImeOperationResult> {
  if (!Number.isInteger(size) || size <= 0) {
    return { success: false, message: 'size must be a positive integer' }
  }

  try {
    const imeApi = await getImeApi()
    await imeApi.setPageSize(size)
    return success('Page size updated')
  } catch (error) {
    return failure(error, '[IPC:IME] Failed to set page size')
  }
}

async function handleImeDeploy(): Promise<ImeOperationResult> {
  try {
    const imeApi = await getImeApi()
    await imeApi.deploy()
    return success('IME deploy completed')
  } catch (error) {
    return failure(error, '[IPC:IME] Deploy failed')
  }
}

async function handleImeReset(): Promise<ImeOperationResult> {
  try {
    const imeApi = await getImeApi()
    await imeApi.resetUserDirectory()
    return success('IME user data reset completed')
  } catch (error) {
    return failure(error, '[IPC:IME] Reset failed')
  }
}

export function registerImeHandlers(): void {
  logger.debug('[IPC:IME] Registering IME handlers')
  ipcMain.handle(IPC_CHANNELS.IME_GET_CONFIG, handleImeGetConfig)
  ipcMain.handle(IPC_CHANNELS.IME_SET_SCHEMA, handleImeSetSchema)
  ipcMain.handle(IPC_CHANNELS.IME_PROCESS_INPUT, handleImeProcessInput)
  ipcMain.handle(IPC_CHANNELS.IME_SELECT_CANDIDATE, handleImeSelectCandidate)
  ipcMain.handle(IPC_CHANNELS.IME_CHANGE_PAGE, handleImeChangePage)
  ipcMain.handle(IPC_CHANNELS.IME_SET_OPTION, handleImeSetOption)
  ipcMain.handle(IPC_CHANNELS.IME_SET_PAGE_SIZE, handleImeSetPageSize)
  ipcMain.handle(IPC_CHANNELS.IME_DEPLOY, handleImeDeploy)
  ipcMain.handle(IPC_CHANNELS.IME_RESET, handleImeReset)
}

export function unregisterImeHandlers(): void {
  logger.debug('[IPC:IME] Unregistering IME handlers')
  ipcMain.removeHandler(IPC_CHANNELS.IME_GET_CONFIG)
  ipcMain.removeHandler(IPC_CHANNELS.IME_SET_SCHEMA)
  ipcMain.removeHandler(IPC_CHANNELS.IME_PROCESS_INPUT)
  ipcMain.removeHandler(IPC_CHANNELS.IME_SELECT_CANDIDATE)
  ipcMain.removeHandler(IPC_CHANNELS.IME_CHANGE_PAGE)
  ipcMain.removeHandler(IPC_CHANNELS.IME_SET_OPTION)
  ipcMain.removeHandler(IPC_CHANNELS.IME_SET_PAGE_SIZE)
  ipcMain.removeHandler(IPC_CHANNELS.IME_DEPLOY)
  ipcMain.removeHandler(IPC_CHANNELS.IME_RESET)
}

export {
  handleImeGetConfig,
  handleImeSetSchema,
  handleImeProcessInput,
  handleImeSelectCandidate,
  handleImeChangePage,
  handleImeSetOption,
  handleImeSetPageSize,
  handleImeDeploy,
  handleImeReset,
}
