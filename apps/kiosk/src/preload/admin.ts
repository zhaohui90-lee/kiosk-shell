/**
 * @kiosk/app - Admin Preload Script
 * Exposes admin API to admin window via contextBridge
 *
 * SECURITY NOTES:
 * - contextIsolation MUST be enabled
 * - nodeIntegration MUST be disabled
 * - Only admin IPC channels are accessible through this preload
 */

// Import and auto-execute the admin preload script from @kiosk/ipc
// This will expose adminAPI to window.adminAPI via contextBridge
import '@kiosk/ipc/admin-preload';
