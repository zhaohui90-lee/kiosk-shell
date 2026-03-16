/**
 * Admin panel IPC handlers facade.
 * Keeps backward-compatible exports while implementation lives in submodules.
 */

export { setAdminPassword, verifyAdminSessionToken, invalidateSession, handleAdminLogin } from './admin/auth'
export { setMainWindowRef } from './admin/window-context'
export { registerAdminHandlers, unregisterAdminHandlers } from './admin/registration'
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
} from './admin/operations'
