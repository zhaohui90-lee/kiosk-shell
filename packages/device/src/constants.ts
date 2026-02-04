/**
 * @kiosk/device constants
 * Device identification and hardware info constants
 */

import type { UuidManagerConfig, HardwareInfoConfig } from './types';

/**
 * Default UUID manager configuration
 */
export const DEFAULT_UUID_MANAGER_CONFIG: UuidManagerConfig = {
  storageLocation: 'userData',
  fileName: 'device-uuid.json',
  generationMethod: 'random',
  cacheInMemory: true,
};

/**
 * Default hardware info collector configuration
 */
export const DEFAULT_HARDWARE_INFO_CONFIG: HardwareInfoConfig = {
  includeNetwork: true,
  includeDisplays: true,
  includeInternalInterfaces: false,
};

/**
 * UUID validation regex pattern
 * Matches standard UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Error messages for device module
 */
export const ERROR_MESSAGES = {
  UUID_NOT_INITIALIZED: 'UUID manager is not initialized. Call initUuidManager() first.',
  UUID_STORAGE_READ_FAILED: 'Failed to read UUID from storage',
  UUID_STORAGE_WRITE_FAILED: 'Failed to write UUID to storage',
  UUID_INVALID_FORMAT: 'Invalid UUID format',
  UUID_FILE_CORRUPTED: 'UUID file is corrupted or invalid',
  HARDWARE_INFO_FAILED: 'Failed to collect hardware information',
  DISPLAY_INFO_UNAVAILABLE: 'Display information is not available (requires Electron screen module)',
  CUSTOM_PATH_REQUIRED: 'Custom storage path is required when using custom storage location',
} as const;

/**
 * Log messages for device module
 */
export const LOG_MESSAGES = {
  UUID_INITIALIZED: 'UUID manager initialized',
  UUID_GENERATED: 'New device UUID generated',
  UUID_LOADED: 'Device UUID loaded from storage',
  UUID_SAVED: 'Device UUID saved to storage',
  HARDWARE_INFO_COLLECTED: 'Hardware information collected',
} as const;

/**
 * Platform-specific paths (relative to app data)
 */
export const STORAGE_PATHS = {
  win32: 'kiosk-shell',
  darwin: 'kiosk-shell',
  linux: 'kiosk-shell',
} as const;

/**
 * Minimum and maximum values for validation
 */
export const VALIDATION = {
  /** Minimum valid memory size (1 MB) */
  MIN_MEMORY_BYTES: 1024 * 1024,
  /** Maximum reasonable memory size (1 TB) */
  MAX_MEMORY_BYTES: 1024 * 1024 * 1024 * 1024,
  /** Minimum CPU cores */
  MIN_CPU_CORES: 1,
  /** Maximum reasonable CPU cores */
  MAX_CPU_CORES: 512,
} as const;
