/**
 * Application configuration loader
 * Loads configuration from external file with fallback to defaults
 */

import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { getLogger } from '@kiosk/logger';

const logger = getLogger();

/**
 * Application configuration interface
 */
export interface AppConfig {
  /** Enable kiosk mode (fullscreen, shortcuts blocked) */
  kioskMode: boolean;
  /** Enable DevTools access */
  devMode: boolean;
  /** Enable crash monitoring */
  crashMonitoring: boolean;
  /** Enable blank screen detection */
  blankDetection: boolean;
  /** Content URL to load (file:// or kiosk://) */
  contentUrl: string;
  /** Window width (ignored in kiosk mode) */
  width: number;
  /** Window height (ignored in kiosk mode) */
  height: number;
  /** Whitelist of allowed external domains for CSP */
  whitelist: string[];
}

/**
 * Default configuration
 * In production: kiosk mode ON, devMode OFF
 * In development: kiosk mode OFF, devMode ON
 */
const DEFAULT_CONFIG: AppConfig = {
  kioskMode: process.env['NODE_ENV'] === 'production',
  devMode: process.env['NODE_ENV'] !== 'production',
  crashMonitoring: true,
  blankDetection: true,
  contentUrl: 'kiosk://renderer/index.html',
  width: 1920,
  height: 1080,
  whitelist: [],
};

/**
 * Configuration file name
 */
const CONFIG_FILE_NAME = 'kiosk.config.json';

/**
 * Get the configuration file path for writing (user overrides)
 * Always writes to userData directory (user-writable)
 */
function getUserConfigFilePath(): string {
  return join(app.getPath('userData'), CONFIG_FILE_NAME);
}

/**
 * Get the bundled configuration file path
 * In production: process.resourcesPath (extraResources)
 * In development: project root
 */
function getBundledConfigFilePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, CONFIG_FILE_NAME);
  }
  // Development: use project root
  return join(app.getAppPath(), CONFIG_FILE_NAME);
}

/**
 * Get the configuration file path for reading
 * Priority: userData (user overrides) > resourcesPath (bundled default)
 * In development: project root
 */
function getConfigFilePath(): string {
  if (!app.isPackaged) {
    // Development: use project root
    return join(app.getAppPath(), CONFIG_FILE_NAME);
  }

  // Production: check userData first (user overrides)
  const userConfigPath = getUserConfigFilePath();
  if (existsSync(userConfigPath)) {
    return userConfigPath;
  }

  // Fallback to bundled config in resources
  return getBundledConfigFilePath();
}

/**
 * Load configuration from file
 * Falls back to defaults if file doesn't exist or is invalid
 */
export function loadConfig(): AppConfig {
  const configPath = getConfigFilePath();

  try {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(content) as Partial<AppConfig>;

      // Merge with defaults (file config takes precedence)
      const mergedConfig = { ...DEFAULT_CONFIG, ...fileConfig };

      logger.info('[config] Configuration loaded from file', { path: configPath });
      logger.debug('[config] Configuration values', {
        kioskMode: mergedConfig.kioskMode,
        devMode: mergedConfig.devMode,
      });

      return mergedConfig;
    }
  } catch (error) {
    logger.warn('[config] Failed to load configuration file, using defaults', {
      path: configPath,
      error: String(error),
    });
  }

  logger.info('[config] Using default configuration');
  return { ...DEFAULT_CONFIG };
}

/**
 * Save current configuration to file
 * Always saves to userData directory (user-writable)
 */
export function saveConfig(config: AppConfig): void {
  const configPath = app.isPackaged ? getUserConfigFilePath() : join(app.getAppPath(), CONFIG_FILE_NAME);

  try {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    logger.info('[config] Configuration saved', { path: configPath });
  } catch (error) {
    logger.error('[config] Failed to save configuration', {
      path: configPath,
      error: String(error),
    });
  }
}

/**
 * Ensure configuration file exists in userData
 * In production: copies bundled config from resources to userData if not present
 */
export function ensureConfigFile(): void {
  if (!app.isPackaged) {
    // Development: create default config at project root if not present
    const devConfigPath = join(app.getAppPath(), CONFIG_FILE_NAME);
    if (!existsSync(devConfigPath)) {
      saveConfig(DEFAULT_CONFIG);
      logger.info('[config] Created default configuration file', { path: devConfigPath });
    }
    return;
  }

  // Production: copy bundled config to userData if not present
  const userConfigPath = getUserConfigFilePath();
  if (!existsSync(userConfigPath)) {
    const bundledConfigPath = getBundledConfigFilePath();
    if (existsSync(bundledConfigPath)) {
      // Copy bundled config to userData
      try {
        const dir = dirname(userConfigPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        const content = readFileSync(bundledConfigPath, 'utf-8');
        writeFileSync(userConfigPath, content, 'utf-8');
        logger.info('[config] Copied bundled config to userData', {
          from: bundledConfigPath,
          to: userConfigPath,
        });
      } catch (error) {
        logger.warn('[config] Failed to copy bundled config to userData', {
          error: String(error),
        });
      }
    } else {
      // No bundled config, create default
      saveConfig(DEFAULT_CONFIG);
      logger.info('[config] Created default configuration file', { path: userConfigPath });
    }
  }
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): AppConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Generate Content-Security-Policy string based on whitelist
 * @param whitelist - Array of allowed external domains
 * @returns CSP policy string
 */
export function generateCSP(whitelist: string[] = []): string {
  // Base sources (always allowed)
  const baseSources = ["'self'", 'kiosk:'];

  // Add whitelist domains
  const allSources = [...baseSources, ...whitelist];
  const sourcesStr = allSources.join(' ');

  // Build CSP directives
  const directives = [
    `default-src ${sourcesStr}`,
    `script-src ${sourcesStr} 'unsafe-inline'`,
    `style-src ${sourcesStr} 'unsafe-inline'`,
    `img-src ${sourcesStr} data: blob:`,
    `font-src ${sourcesStr} data:`,
    `connect-src ${sourcesStr}`,
    `media-src ${sourcesStr}`,
    `frame-src ${sourcesStr}`,
  ];

  return directives.join('; ') + ';';
}

export { DEFAULT_CONFIG };
