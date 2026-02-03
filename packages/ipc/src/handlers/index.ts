/**
 * IPC handlers index
 * Exports all handler registration functions
 */

export {
  registerSystemHandlers,
  unregisterSystemHandlers,
  handleSystemShutdown,
  handleSystemRestart,
} from './system';

export {
  registerDeviceHandlers,
  unregisterDeviceHandlers,
  handleGetDeviceInfo,
} from './device';

export {
  registerDebugHandlers,
  unregisterDebugHandlers,
  handleOpenDevTools,
  setDebugPassword,
} from './debug';
