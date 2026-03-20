/**
 * Admin panel IPC handlers facade.
 * Keeps backward-compatible exports while implementation lives in submodules.
 */

export { setAdminPassword, verifyAdminSessionToken, invalidateSession, handleAdminLogin } from './auth'
export { setMainWindowRef } from './window-context'
export { registerAdminHandlers, unregisterAdminHandlers } from './registration'
export {
  handleAdminExitApp,
  handleAdminRestartApp,
  handleAdminSystemRestart,
  handleAdminSystemShutdown,
  handleAdminGetConfig,
  handleAdminGetSystemInfo,
  handleAdminReloadBusiness,
  handleAdminTestNetwork,
  parsePingResult,
  isValidHost,
} from './operations'
