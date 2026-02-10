/**
 * Application configuration loader
 * Loads configuration from external file with fallback to defaults
 */

import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
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
  /** Admin panel password (optional, overrides default) */
  adminPassword?: string;
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
 * In development: project root
 * In production: userData (ensureProdConfig guarantees it exists after sync)
 */
function getConfigFilePath(): string {
  if (!app.isPackaged) {
    // Development: use project root
    return join(app.getAppPath(), CONFIG_FILE_NAME);
  }

  // Production: always read from userData
  // (ensureProdConfig has already synced resources → userData)
  return getUserConfigFilePath();
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
 * In production: copies bundled config from resources to userData (always overwrite)
 * In development: creates default config at project root if not present
 */
export function ensureConfigFile(): void {
  try {
    if (!app.isPackaged) {
      ensureDevConfig();
    } else {
      ensureProdConfig();
    }
  } catch (error) {
    logger.error('[config] Fatal error ensuring config file', {
      error: String(error),
    });
    throw error;
  }
}

function ensureDevConfig(): void {
  // Development: create default config at project root if not present
  const devConfigPath = join(app.getAppPath(), CONFIG_FILE_NAME);

  if (!existsSync(devConfigPath)) {
    // create the default config
    saveConfig(DEFAULT_CONFIG);
    logger.info('[config] Created default configuration file', {
      path: devConfigPath
    });
  } else {
    // In dev mode, ensure new default fields are added to existing config
    updateDevConfigFile(devConfigPath);
  }
}

/**
 * Update dev config file: merge existing config with DEFAULT_CONFIG
 * to ensure new fields are added. Only used in development mode.
 */
function updateDevConfigFile(configPath: string): void {
  try {
    const content = readFileSync(configPath, 'utf-8');
    const existingConfig = JSON.parse(content) as Partial<AppConfig>;
    const mergedConfig = { ...DEFAULT_CONFIG, ...existingConfig };

    // Compare to avoid unnecessary writes
    const currentContent = JSON.stringify(existingConfig);
    const mergedContent = JSON.stringify(mergedConfig);
    if (currentContent !== mergedContent) {
      saveConfig(mergedConfig);
      logger.info('[config] Updated dev configuration file with new default fields', { path: configPath });
    } else {
      logger.debug('[config] Dev configuration is up to date', { path: configPath });
    }
  } catch (error) {
    logger.warn('[config] Failed to update dev config, keeping existing', {
      error: String(error),
    });
  }
}

/**
 * Ensure production config:
 * - resources/kiosk.config.json exists → always copy to userData (overwrite)
 * - resources doesn't exist + userData doesn't exist → create from DEFAULT_CONFIG
 * - resources doesn't exist + userData exists → keep userData unchanged
 */
function ensureProdConfig(): void {
  const userConfigPath = getUserConfigFilePath();
  const bundledConfigPath = getBundledConfigFilePath();

  if (existsSync(bundledConfigPath)) {
    // Resources config is the master config — always overwrite userData
    try {
      const dir = dirname(userConfigPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      copyFileSync(bundledConfigPath, userConfigPath);
      logger.info('[config] Synced bundled config to userData (overwrite)', {
        from: bundledConfigPath,
        to: userConfigPath,
      });
    } catch (error) {
      logger.error('[config] Failed to copy bundled config to userData', {
        error: String(error),
      });
    }
  } else if (!existsSync(userConfigPath)) {
    // No bundled config and no userData config — create from defaults
    saveConfig(DEFAULT_CONFIG);
    logger.info('[config] Created default configuration file', {
      path: userConfigPath
    });
  } else {
    // No bundled config but userData exists — keep as-is
    logger.debug('[config] No bundled config found, keeping existing userData config', {
      path: userConfigPath,
    });
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
