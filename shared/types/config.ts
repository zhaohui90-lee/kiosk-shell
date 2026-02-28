/**
 * Application configuration interface
 */
export interface AppConfig {
  /** Enable kiosk mode (fullscreen, shortcuts blocked) */
  kioskMode: boolean
  /** Enable DevTools access */
  devMode: boolean
  /** Enable crash monitoring */
  crashMonitoring: boolean
  /** Enable blank screen detection */
  blankDetection: boolean
  /** Content URL to load (file:// or kiosk://) */
  contentUrl: string
  /** Window width (ignored in kiosk mode) */
  width: number
  /** Window height (ignored in kiosk mode) */
  height: number
  /** Whitelist of allowed external domains for CSP */
  whitelist: string[]
  /** Admin panel password (optional, overrides default) */
  adminPassword?: string
  /** Device number */
  deviceNo: string
}

/**
 * Default configuration
 * In production: kiosk mode ON, devMode OFF
 * In development: kiosk mode OFF, devMode ON
 */
export const DEFAULT_CONFIG: AppConfig = {
  kioskMode: process.env['NODE_ENV'] === 'production',
  devMode: process.env['NODE_ENV'] !== 'production',
  crashMonitoring: true,
  blankDetection: true,
  contentUrl: 'kiosk://renderer/index.html',
  width: 1920,
  height: 1080,
  whitelist: [],
  deviceNo: 'KSK-001',
}
