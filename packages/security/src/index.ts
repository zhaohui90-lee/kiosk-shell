/**
 * @kiosk/security
 * Security module for shortcuts blocking, kiosk mode, and IPC guard
 */

// Export types
export type {
  Platform,
  Shortcut,
  ShortcutBlockerConfig,
  ShortcutBlockerState,
  ShortcutHandler,
  KioskModeConfig,
  KioskModeState,
  KioskModeResult,
  IpcGuardConfig,
  IpcValidationResult,
} from './types';

// Export constants
export {
  CURRENT_PLATFORM,
  DEFAULT_BLOCKED_SHORTCUTS,
  DEVTOOLS_SHORTCUTS,
  DEFAULT_IPC_WHITELIST,
  DEFAULT_KIOSK_CONFIG,
  ERROR_MESSAGES,
} from './constants';

// Export shortcuts functions
export {
  setShortcutHandler,
  getShortcutsToBlock,
  blockShortcuts,
  unblockShortcuts,
  getBlockerState,
  isShortcutBlocked,
  blockSingleShortcut,
  unblockSingleShortcut,
  resetBlockerStates,
} from './shortcuts';

// Export kiosk mode functions
export {
  setExitPassword,
  verifyExitPassword,
  getKioskState,
  isKioskModeEnabled,
  enableKioskMode,
  disableKioskMode,
  toggleKioskMode,
  updateKioskConfig,
  resetKioskStates,
  getKioskModeWindows,
} from './kiosk-mode';

// Export IPC guard functions
export {
  configureIpcGuard,
  getIpcGuardConfig,
  addAllowedChannel,
  removeAllowedChannel,
  addAllowedWebContentsId,
  removeAllowedWebContentsId,
  isChannelAllowed,
  isSourceAllowed,
  validateIpcRequest,
  createGuardedHandler,
  resetIpcGuard,
  setSourceValidation,
  getAllowedChannels,
  getAllowedWebContentsIds,
} from './ipc-guard';
