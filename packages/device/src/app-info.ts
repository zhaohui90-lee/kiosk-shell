import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { getLogger } from '@kiosk/logger'

import { DEFAULT_CONFIG, type AppConfig } from '@kiosk/shared'

const logger = getLogger()

/**
 * Configuration file name
 */
export const CONFIG_FILE_NAME = 'kiosk.config.json'

/**
 * Get the configuration file path for writing (user overrides)
 * Always writes to userData directory (user-writable)
 */
export function getUserConfigFilePath(): string {
  return join(app.getPath('userData'), CONFIG_FILE_NAME)
}

/**
 * Get the bundled configuration file path
 * In production: process.resourcesPath (extraResources)
 * In development: project root
 */
export function getBundledConfigFilePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, CONFIG_FILE_NAME)
  }
  // Development: use project root
  return join(app.getAppPath(), CONFIG_FILE_NAME)
}

/**
 * Get the configuration file path for reading
 * In development: project root
 * In production: userData (ensureProdConfig guarantees it exists after sync)
 */
function getConfigFilePath(): string {
  if (!app.isPackaged) {
    // Development: use project root
    return join(app.getAppPath(), CONFIG_FILE_NAME)
  }

  // Production: always read from userData
  // (ensureProdConfig has already synced resources → userData)
  return getUserConfigFilePath()
}

export function loadConfig(): AppConfig {
  const configPath = getConfigFilePath()

  try {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8')
      const fileConfig = JSON.parse(content) as Partial<AppConfig>

      // Merge with defaults (file config takes precedence)
      const mergedConfig = { ...DEFAULT_CONFIG, ...fileConfig }

      logger.info('[config] Configuration loaded from file', { path: configPath })
      logger.debug('[config] Configuration values', {
        kioskMode: mergedConfig.kioskMode,
        devMode: mergedConfig.devMode,
      })

      return mergedConfig
    }
  } catch (error) {
    logger.warn('[config] Failed to load configuration file, using defaults', {
      path: configPath,
      error: String(error),
    })
  }

  logger.info('[config] Using default configuration')
  return { ...DEFAULT_CONFIG }
}

/**
 * Save current configuration to file
 * Always saves to userData directory (user-writable)
 */
export function saveConfig(config: AppConfig): void {
  const configPath = app.isPackaged ? getUserConfigFilePath() : join(app.getAppPath(), CONFIG_FILE_NAME)

  try {
    const dir = dirname(configPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    logger.info('[config] Configuration saved', { path: configPath })
  } catch (error) {
    logger.error('[config] Failed to save configuration', {
      path: configPath,
      error: String(error),
    })
  }
}

/**
 * Update dev config file: merge existing config with DEFAULT_CONFIG
 * to ensure new fields are added. Only used in development mode.
 */
export function updateDevConfigFile(configPath: string): void {
  try {
    const content = readFileSync(configPath, 'utf-8')
    const existingConfig = JSON.parse(content) as Partial<AppConfig>
    const mergedConfig = { ...DEFAULT_CONFIG, ...existingConfig }

    // Compare to avoid unnecessary writes
    const currentContent = JSON.stringify(existingConfig)
    const mergedContent = JSON.stringify(mergedConfig)
    if (currentContent !== mergedContent) {
      saveConfig(mergedConfig)
      logger.info('[config] Updated dev configuration file with new default fields', { path: configPath })
    } else {
      logger.debug('[config] Dev configuration is up to date', { path: configPath })
    }
  } catch (error) {
    logger.warn('[config] Failed to update dev config, keeping existing', {
      error: String(error),
    })
  }
}
