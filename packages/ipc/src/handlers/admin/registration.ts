import { ipcMain } from 'electron'
import { getLogger } from '@kiosk/logger'
import { IPC_CHANNELS } from '../../types'
import { handleAdminLogin, invalidateSession } from './auth'
import {
  handleAdminBusinessStatus,
  handleAdminCollectHardwareInfo,
  handleAdminExitApp,
  handleAdminGetConfig,
  handleAdminGetSystemInfo,
  handleAdminPanelClose,
  handleAdminReloadBusiness,
  handleAdminRestartApp,
  handleAdminSystemRestart,
  handleAdminSystemShutdown,
  handleAdminTestNetwork,
} from './operations'

const logger = getLogger()

export function registerAdminHandlers(): void {
  logger.debug('[IPC:Admin] Registering admin handlers')

  ipcMain.handle(IPC_CHANNELS.ADMIN_WINDOW_CLOSE, handleAdminPanelClose)
  ipcMain.handle(IPC_CHANNELS.ADMIN_LOGIN, handleAdminLogin)
  ipcMain.handle(IPC_CHANNELS.ADMIN_EXIT_APP, handleAdminExitApp)
  ipcMain.handle(IPC_CHANNELS.ADMIN_RESTART_APP, handleAdminRestartApp)
  ipcMain.handle(IPC_CHANNELS.ADMIN_SYSTEM_RESTART, handleAdminSystemRestart)
  ipcMain.handle(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN, handleAdminSystemShutdown)
  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_CONFIG, handleAdminGetConfig)
  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO, handleAdminGetSystemInfo)
  ipcMain.handle(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS, handleAdminReloadBusiness)
  ipcMain.handle(IPC_CHANNELS.ADMIN_NETWORK_TEST, handleAdminTestNetwork)
  ipcMain.handle(IPC_CHANNELS.ADMIN_BUSINESS_STATUS, handleAdminBusinessStatus)
  ipcMain.handle(IPC_CHANNELS.ADMIN_COLLECT_HARDWARE_INFO, handleAdminCollectHardwareInfo)

  logger.debug('[IPC:Admin] Admin handlers registered')
}

export function unregisterAdminHandlers(): void {
  logger.debug('[IPC:Admin] Unregistering admin handlers')

  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_WINDOW_CLOSE)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_LOGIN)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_EXIT_APP)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_RESTART_APP)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_SYSTEM_RESTART)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_GET_CONFIG)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_NETWORK_TEST)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_BUSINESS_STATUS)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_COLLECT_HARDWARE_INFO)

  invalidateSession()

  logger.debug('[IPC:Admin] Admin handlers unregistered')
}
