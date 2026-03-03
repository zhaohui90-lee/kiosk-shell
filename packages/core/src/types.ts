/**
 * @kiosk/core type definitions
 */

import type { BrowserWindowConstructorOptions } from 'electron';

/**
 * Window configuration options
 */
export interface WindowConfig {
  /** Window width (default: 1920) */
  width?: number;
  /** Window height (default: 1080) */
  height?: number;
  /** Start in fullscreen mode (default: true in production) */
  fullscreen?: boolean;
  /** Start in kiosk mode (default: true in production) */
  kiosk?: boolean;
  /** Show window frame (default: false) */
  frame?: boolean;
  /** Allow resizing (default: false) */
  resizable?: boolean;
  /** Show in taskbar (default: false in production) */
  skipTaskbar?: boolean;
  /** Always on top (default: true in production) */
  alwaysOnTop?: boolean;
  /** Enable DevTools (default: false in production) */
  devTools?: boolean;
  /** Enable sandbox mode (default: true, disable for dev with workspace deps) */
  sandbox?: boolean;
  /** Background color (default: #FFFFFF) */
  backgroundColor?: string;
  /** Preload script path */
  preload?: string;
  /** Additional BrowserWindow options */
  additionalOptions?: Partial<BrowserWindowConstructorOptions>;
}

/**
 * Admin window configuration
 */
export interface AdminWindowConfig {
  /** Preload script path for admin window */
  preload?: string;
  /** Window width (default: 480) */
  width?: number;
  /** Window height (default: 600) */
  height?: number;
  /** HTML file path to load */
  loadFile?: string;
}

/**
 * Resource loader configuration
 */
export interface LoaderConfig {
  /** Base path for static resources */
  basePath: string;
  /** Use kiosk:// protocol instead of file:// */
  useKioskProtocol?: boolean;
  /** Default entry file (default: index.html) */
  entryFile?: string;
  /** Enable A/B slot switching */
  enableSlotSwitching?: boolean;
}

/**
 * Active slot identifier for A/B deployment
 */
export type SlotId = 'slot-a' | 'slot-b';

/**
 * Slot status information
 */
export interface SlotInfo {
  id: SlotId;
  path: string;
  version: string | undefined;
  lastModified: Date | undefined;
  isActive: boolean;
}

/**
 * Protocol handler result
 */
export interface ProtocolResponse {
  /** MIME type of the response */
  mimeType: string;
  /** Response data as Buffer */
  data: Buffer;
  /** HTTP status code */
  statusCode?: number;
}

/**
 * Lifecycle event types
 */
export type LifecycleEvent =
  | 'ready'
  | 'window-all-closed'
  | 'before-quit'
  | 'will-quit'
  | 'quit'
  | 'activate'
  | 'second-instance';

/**
 * Lifecycle event handler
 */
export type LifecycleHandler = (...args: unknown[]) => void | Promise<void>;

/**
 * Application state
 */
export interface AppState {
  /** Whether app is ready */
  isReady: boolean;
  /** Whether app is quitting */
  isQuitting: boolean;
  /** Main window reference */
  mainWindow: unknown | null;
  /** Current active slot */
  activeSlot: SlotId;
}
