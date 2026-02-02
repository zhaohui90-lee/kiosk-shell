/**
 * @kiosk/platform
 * Platform adapter for Windows and macOS
 */

// Export types
export type {
  Platform,
  PlatformAdapter,
  SystemInfo,
  ShutdownOptions,
  RestartOptions,
  ShortcutConfig,
} from './types';

// Export adapter factory
export {
  detectPlatform,
  createPlatformAdapter,
  getPlatformAdapter,
  resetPlatformAdapter,
} from './adapter';

// Export platform implementations (for direct use if needed)
export { WindowsAdapter } from './windows';
export { DarwinAdapter } from './darwin';
