/**
 * IPC handlers index
 * Exports all handler registration functions
 */

export { registerSystemHandlers, unregisterSystemHandlers, handleSystemShutdown, handleSystemRestart } from './system'

export { registerDebugHandlers, unregisterDebugHandlers, handleOpenDevTools, setDebugPassword } from './debug'

export {
  registerAdminHandlers,
  unregisterAdminHandlers,
  handleAdminLogin,
  handleAdminExitApp,
  handleAdminRestartApp,
  handleAdminSystemRestart,
  handleAdminSystemShutdown,
  handleAdminGetConfig,
  handleAdminGetSystemInfo,
  handleAdminReloadBusiness,
  setAdminPassword,
  setMainWindowRef,
  invalidateSession,
  verifyAdminSessionToken,
} from './admin'
