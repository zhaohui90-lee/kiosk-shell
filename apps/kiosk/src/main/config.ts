/**
 * Application configuration loader
 * Loads configuration from external file with fallback to defaults
 */

import { app } from 'electron'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import { dirname, join } from 'path'
import { getLogger, type LoggerOptions } from '@kiosk/logger'
import { type AppConfig, DEFAULT_CONFIG } from '@kiosk/shared'
import {
  CONFIG_FILE_NAME,
  getUserConfigFilePath,
  getBundledConfigFilePath,
  loadConfig,
  saveConfig,
  updateDevConfigFile,
} from '@kiosk/device'

const logger = getLogger()

/**
 * Ensure configuration file exists in userData
 * In production: copies bundled config from resources to userData (always overwrite)
 * In development: creates default config at project root if not present
 */
export function ensureConfigFile(): void {
  try {
    if (!app.isPackaged) {
      ensureDevConfig()
    } else {
      ensureProdConfig()
    }
  } catch (error) {
    logger.error('[config] Fatal error ensuring config file', {
      error: String(error),
    })
    throw error
  }
}

function ensureDevConfig(): void {
  // Development: create default config at project root if not present
  const devConfigPath = join(app.getAppPath(), CONFIG_FILE_NAME)

  if (!existsSync(devConfigPath)) {
    // create the default config
    saveConfig(DEFAULT_CONFIG)
    logger.info('[config] Created default configuration file', {
      path: devConfigPath,
    })
  } else {
    // In dev mode, ensure new default fields are added to existing config
    updateDevConfigFile(devConfigPath)
  }
}

/**
 * Ensure production config:
 * - resources/kiosk.config.json exists → always copy to userData (overwrite)
 * - resources doesn't exist + userData doesn't exist → create from DEFAULT_CONFIG
 * - resources doesn't exist + userData exists → keep userData unchanged
 */
function ensureProdConfig(): void {
  const userConfigPath = getUserConfigFilePath()
  const bundledConfigPath = getBundledConfigFilePath()

  if (existsSync(bundledConfigPath)) {
    // Resources config is the master config — always overwrite userData
    try {
      const dir = dirname(userConfigPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      copyFileSync(bundledConfigPath, userConfigPath)
      logger.info('[config] Synced bundled config to userData (overwrite)', {
        from: bundledConfigPath,
        to: userConfigPath,
      })
    } catch (error) {
      logger.error('[config] Failed to copy bundled config to userData', {
        error: String(error),
      })
    }
  } else if (!existsSync(userConfigPath)) {
    // No bundled config and no userData config — create from defaults
    saveConfig(DEFAULT_CONFIG)
    logger.info('[config] Created default configuration file', {
      path: userConfigPath,
    })
  } else {
    // No bundled config but userData exists — keep as-is
    logger.debug('[config] No bundled config found, keeping existing userData config', {
      path: userConfigPath,
    })
  }
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): AppConfig {
  return {
    ...DEFAULT_CONFIG,
    logger: {
      ...DEFAULT_CONFIG.logger,
    },
  }
}

export function getRemoteLoggerOptions(
  config: AppConfig,
): NonNullable<LoggerOptions['remote']> {
  return {
    enabled: true,
    serverUrl: config.logger.serverUrl,
    minLevel: config.logger.minLevel,
  }
}

/**
 * Generate Content-Security-Policy string based on whitelist
 * @param whitelist - Array of allowed external domains
 * @returns CSP policy string
 */
export function generateCSP(whitelist: string[] = []): string {
  // Base sources (always allowed)
  const baseSources = ["'self'", 'kiosk:']

  // Add whitelist domains
  const allSources = [...baseSources, ...whitelist]
  const sourcesStr = allSources.join(' ')

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
  ]

  return directives.join('; ') + ';'
}

export { DEFAULT_CONFIG, loadConfig, saveConfig }
