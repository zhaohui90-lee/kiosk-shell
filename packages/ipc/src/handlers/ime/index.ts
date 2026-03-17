import { ipcMain } from 'electron'
import { getLogger } from '@kiosk/logger'
import {
  setIME,
  process as processInput,
  selectCandidateOnCurrentPage,
  changePage,
  setOption,
  setPageSize,
  deploy,
  resetUserDirectory,
} from '@kiosk/plugin-rime'
import { IPC_CHANNELS } from '../../types'
import type { ImeOperationResult } from '../../types'
import type { RIME_RESULT } from '@kiosk/shared'

const logger = getLogger()

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
    await setIME(schemaId)
    return success('IME schema updated')
  } catch (error) {
    return failure(error, '[IPC:IME] Failed to set schema')
  }
}

async function handleImeProcessInput(
  _event: Electron.IpcMainInvokeEvent,
  input: string,
): Promise<RIME_RESULT> {
  return processInput(input)
}

async function handleImeSelectCandidate(
  _event: Electron.IpcMainInvokeEvent,
  index: number,
): Promise<string | null> {
  if (!Number.isInteger(index) || index < 0) {
    return null
  }
  return selectCandidateOnCurrentPage(index)
}

async function handleImeChangePage(
  _event: Electron.IpcMainInvokeEvent,
  backward: boolean,
): Promise<string> {
  return changePage(backward)
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
    await setOption(option, value)
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
    await setPageSize(size)
    return success('Page size updated')
  } catch (error) {
    return failure(error, '[IPC:IME] Failed to set page size')
  }
}

async function handleImeDeploy(): Promise<ImeOperationResult> {
  try {
    await deploy()
    return success('IME deploy completed')
  } catch (error) {
    return failure(error, '[IPC:IME] Deploy failed')
  }
}

async function handleImeReset(): Promise<ImeOperationResult> {
  try {
    await resetUserDirectory()
    return success('IME user data reset completed')
  } catch (error) {
    return failure(error, '[IPC:IME] Reset failed')
  }
}

export function registerImeHandlers(): void {
  logger.debug('[IPC:IME] Registering IME handlers')
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
  handleImeSetSchema,
  handleImeProcessInput,
  handleImeSelectCandidate,
  handleImeChangePage,
  handleImeSetOption,
  handleImeSetPageSize,
  handleImeDeploy,
  handleImeReset,
}
