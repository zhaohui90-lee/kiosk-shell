/**
 * @kiosk/security constants
 */

import type { Shortcut, Platform } from './types';

/**
 * Current platform
 */
export const CURRENT_PLATFORM: Platform = process.platform === 'darwin' ? 'darwin' : 'win32';

/**
 * Default dangerous shortcuts that should be blocked in kiosk mode
 */
export const DEFAULT_BLOCKED_SHORTCUTS: Shortcut[] = [
  // Window close shortcuts
  {
    accelerator: 'Alt+F4',
    description: 'Close window (Windows)',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+Q',
    description: 'Quit application (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Cmd+W',
    description: 'Close window (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Ctrl+W',
    description: 'Close tab/window',
    platforms: ['win32', 'darwin'],
  },

  // Tab/Window switching
  {
    accelerator: 'Cmd+Tab',
    description: 'Switch application (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Alt+Tab',
    description: 'Switch application (Windows)',
    platforms: ['win32'],
  },

  // Refresh shortcuts (prevent page refresh that might break app state)
  {
    accelerator: 'F5',
    description: 'Refresh page',
    platforms: ['win32', 'darwin'],
  },
  {
    accelerator: 'Ctrl+R',
    description: 'Refresh page',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+R',
    description: 'Refresh page (macOS)',
    platforms: ['darwin'],
  },

  // Navigation shortcuts
  {
    accelerator: 'Alt+Left',
    description: 'Go back',
    platforms: ['win32'],
  },
  {
    accelerator: 'Alt+Right',
    description: 'Go forward',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+Left',
    description: 'Go back (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Cmd+Right',
    description: 'Go forward (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Backspace',
    description: 'Go back (might conflict with text input)',
    platforms: ['win32'],
  },

  // Address bar / new window
  {
    accelerator: 'Ctrl+L',
    description: 'Focus address bar',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+L',
    description: 'Focus address bar (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Ctrl+N',
    description: 'New window',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+N',
    description: 'New window (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Ctrl+T',
    description: 'New tab',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+T',
    description: 'New tab (macOS)',
    platforms: ['darwin'],
  },

  // Print (might expose system dialogs)
  {
    accelerator: 'Ctrl+P',
    description: 'Print',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+P',
    description: 'Print (macOS)',
    platforms: ['darwin'],
  },

  // Find (might expose UI)
  {
    accelerator: 'Ctrl+F',
    description: 'Find in page',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+F',
    description: 'Find in page (macOS)',
    platforms: ['darwin'],
  },

  // Zoom
  {
    accelerator: 'Ctrl+Plus',
    description: 'Zoom in',
    platforms: ['win32'],
  },
  {
    accelerator: 'Ctrl+-',
    description: 'Zoom out',
    platforms: ['win32'],
  },
  {
    accelerator: 'Ctrl+0',
    description: 'Reset zoom',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+Plus',
    description: 'Zoom in (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Cmd+-',
    description: 'Zoom out (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Cmd+0',
    description: 'Reset zoom (macOS)',
    platforms: ['darwin'],
  },

  // Fullscreen toggle (we control this)
  {
    accelerator: 'F11',
    description: 'Toggle fullscreen (Windows)',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+Ctrl+F',
    description: 'Toggle fullscreen (macOS)',
    platforms: ['darwin'],
  },

  // Escape (might exit fullscreen)
  {
    accelerator: 'Escape',
    description: 'Exit fullscreen / cancel',
    platforms: ['win32', 'darwin'],
  },

  // Menu bar
  {
    accelerator: 'Alt',
    description: 'Activate menu bar (Windows)',
    platforms: ['win32'],
  },
];

/**
 * DevTools shortcuts
 */
export const DEVTOOLS_SHORTCUTS: Shortcut[] = [
  {
    accelerator: 'F12',
    description: 'Open DevTools',
    platforms: ['win32', 'darwin'],
  },
  {
    accelerator: 'Ctrl+Shift+I',
    description: 'Open DevTools (Windows)',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+Option+I',
    description: 'Open DevTools (macOS)',
    platforms: ['darwin'],
  },
  {
    accelerator: 'Ctrl+Shift+J',
    description: 'Open DevTools Console (Windows)',
    platforms: ['win32'],
  },
  {
    accelerator: 'Cmd+Option+J',
    description: 'Open DevTools Console (macOS)',
    platforms: ['darwin'],
  },
];

/**
 * Default IPC channels whitelist
 */
export const DEFAULT_IPC_WHITELIST: string[] = [
  'shell:systemShutdown',
  'shell:systemRestart',
  'shell:getDeviceInfo',
  'shell:requestUpdate',
  'shell:openDevTools',
];

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_WINDOW: 'No window provided for shortcut registration',
  SHORTCUT_ALREADY_REGISTERED: 'Shortcut is already registered',
  KIOSK_MODE_ALREADY_ENABLED: 'Kiosk mode is already enabled',
  KIOSK_MODE_NOT_ENABLED: 'Kiosk mode is not enabled',
  INVALID_PASSWORD: 'Invalid password',
  IPC_CHANNEL_NOT_ALLOWED: 'IPC channel is not in the whitelist',
  IPC_SOURCE_NOT_ALLOWED: 'IPC source is not allowed',
} as const;

/**
 * Default kiosk mode configuration
 */
export const DEFAULT_KIOSK_CONFIG: {
  blockShortcuts: boolean;
  fullscreen: boolean;
  alwaysOnTop: boolean;
  disableMenuBar: boolean;
  allowDevTools: boolean;
  exitPassword: undefined;
} = {
  blockShortcuts: true,
  fullscreen: true,
  alwaysOnTop: true,
  disableMenuBar: true,
  allowDevTools: false,
  exitPassword: undefined,
};
