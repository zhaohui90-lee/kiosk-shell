/**
 * @kiosk/device
 * Device identification and hardware info module
 */

// Export types
export type {
  UuidStorageLocation,
  UuidGenerationMethod,
  UuidManagerConfig,
  UuidData,
  UuidManagerState,
  OsInfo,
  CpuInfo,
  MemoryInfo,
  NetworkInterface,
  DisplayInfo,
  HardwareInfo,
  HardwareInfoConfig,
  DeviceIdentification,
} from './types';

// Export constants
export {
  DEFAULT_UUID_MANAGER_CONFIG,
  DEFAULT_HARDWARE_INFO_CONFIG,
  UUID_PATTERN,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  STORAGE_PATHS,
  VALIDATION,
} from './constants';

// Export UUID manager functions
export {
  initUuidManager,
  getDeviceUuid,
  getDeviceUuidAsync,
  isUuidManagerInitialized,
  getUuidManagerState,
  resetUuidManager,
  regenerateDeviceUuid,
  isValidUuid,
  generateUuid,
} from './uuid-manager';

// Export hardware info functions
export {
  getOsInfo,
  getCpuInfo,
  getMemoryInfo,
  getNetworkInfo,
  getDisplayInfo,
  collectHardwareInfo,
  formatBytes,
  getHardwareSummary,
} from './hardware-info';
