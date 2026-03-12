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
  /** Extra BrowserWindow options */
  extralOptions?: Partial<BrowserWindowConstructorOptions>;
}
