import { BrowserWindow } from 'electron'
import { getLogger } from '@kiosk/logger'

const logger = getLogger()

let mainWindowRef: BrowserWindow | null = null

export function setMainWindowRef(window: BrowserWindow | null): void {
  mainWindowRef = window
  logger.debug('[IPC:Admin] Main window reference updated')
}

export function getMainWindowRef(): BrowserWindow | null {
  return mainWindowRef
}
