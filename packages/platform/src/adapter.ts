/**
 * Platform adapter factory
 * Returns the appropriate platform implementation based on current OS
 */

import type { Platform, PlatformAdapter } from './types';
import { WindowsAdapter } from './windows';
import { DarwinAdapter } from './darwin';

/**
 * Detect current platform
 */
export function detectPlatform(): Platform {
  const platform = process.platform;

  if (platform === 'win32') {
    return 'win32';
  }

  if (platform === 'darwin') {
    return 'darwin';
  }

  // Default to darwin for development on unsupported platforms
  console.warn(`[Platform] Unsupported platform: ${platform}, defaulting to darwin`);
  return 'darwin';
}

/**
 * Create platform adapter instance
 */
export function createPlatformAdapter(): PlatformAdapter {
  const platform = detectPlatform();

  switch (platform) {
    case 'win32':
      return new WindowsAdapter();
    case 'darwin':
      return new DarwinAdapter();
    default:
      // TypeScript exhaustive check
      const _exhaustive: never = platform;
      throw new Error(`Unsupported platform: ${_exhaustive}`);
  }
}

// Singleton instance
let adapter: PlatformAdapter | null = null;

/**
 * Get the platform adapter singleton
 */
export function getPlatformAdapter(): PlatformAdapter {
  if (!adapter) {
    adapter = createPlatformAdapter();
  }
  return adapter;
}

/**
 * Reset the platform adapter (useful for testing)
 */
export function resetPlatformAdapter(): void {
  adapter = null;
}
