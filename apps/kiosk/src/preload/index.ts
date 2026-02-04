/**
 * @kiosk/app - Preload Script
 * Exposes limited API to renderer via contextBridge
 *
 * This script is loaded into the renderer process before the web content loads.
 * It provides a secure bridge between the renderer and main processes.
 *
 * SECURITY NOTES:
 * - contextIsolation MUST be enabled
 * - nodeIntegration MUST be disabled
 * - All APIs are exposed through contextBridge
 * - Only whitelisted IPC channels are accessible
 */

// Import and auto-execute the preload script from @kiosk/ipc
// This will expose shellAPI to window.shellAPI
import '@kiosk/ipc/preload';

// Re-export for type definitions
export { shellAPI, exposeShellAPI } from '@kiosk/ipc';

/**
 * The shellAPI is now available on window.shellAPI in the renderer process.
 *
 * Available methods:
 * - getDeviceInfo(): Promise<DeviceInfo> - Get device information
 * - requestUpdate(): Promise<UpdateInfo> - Request update check
 * - systemShutdown(password?: string): Promise<void> - System shutdown
 * - systemRestart(password?: string): Promise<void> - System restart
 * - openDevTools(password: string): Promise<boolean> - Open DevTools
 *
 * Usage in renderer:
 * ```typescript
 * // Get device info
 * const deviceInfo = await window.shellAPI.getDeviceInfo();
 *
 * // Request system restart (requires password in kiosk mode)
 * await window.shellAPI.systemRestart('admin123');
 *
 * // Open DevTools for debugging
 * const success = await window.shellAPI.openDevTools('debug_password');
 * ```
 */
