/**
 * IPC Guard - Security layer for IPC communications
 *
 * Provides:
 * - Channel whitelist validation
 * - Source validation (webContents ID verification)
 * - Request logging for security auditing
 */

import { getLogger } from '@kiosk/logger';

const logger = getLogger();
import type { IpcGuardConfig, IpcValidationResult } from './types';
import { DEFAULT_IPC_WHITELIST, ERROR_MESSAGES } from './constants';

/**
 * Current guard configuration
 */
let guardConfig: IpcGuardConfig = {
  allowedChannels: [...DEFAULT_IPC_WHITELIST],
  validateSource: false,
  allowedWebContentsIds: [],
};

/**
 * Configure the IPC guard
 *
 * @param config - Guard configuration
 */
export function configureIpcGuard(config: Partial<IpcGuardConfig>): void {
  guardConfig = {
    ...guardConfig,
    ...config,
  };

  logger.info('IPC guard configured', {
    channelCount: guardConfig.allowedChannels.length,
    validateSource: guardConfig.validateSource,
  });
}

/**
 * Get the current guard configuration
 *
 * @returns Current configuration
 */
export function getIpcGuardConfig(): IpcGuardConfig {
  return {
    ...guardConfig,
    allowedChannels: [...guardConfig.allowedChannels],
    allowedWebContentsIds: guardConfig.allowedWebContentsIds
      ? [...guardConfig.allowedWebContentsIds]
      : [],
  };
}

/**
 * Add a channel to the whitelist
 *
 * @param channel - Channel to add
 */
export function addAllowedChannel(channel: string): void {
  if (!guardConfig.allowedChannels.includes(channel)) {
    guardConfig.allowedChannels.push(channel);
    logger.info(`Added IPC channel to whitelist: ${channel}`);
  }
}

/**
 * Remove a channel from the whitelist
 *
 * @param channel - Channel to remove
 */
export function removeAllowedChannel(channel: string): void {
  const index = guardConfig.allowedChannels.indexOf(channel);
  if (index > -1) {
    guardConfig.allowedChannels.splice(index, 1);
    logger.info(`Removed IPC channel from whitelist: ${channel}`);
  }
}

/**
 * Add a webContents ID to the allowed list
 *
 * @param webContentsId - webContents ID to add
 */
export function addAllowedWebContentsId(webContentsId: number): void {
  if (!guardConfig.allowedWebContentsIds) {
    guardConfig.allowedWebContentsIds = [];
  }
  if (!guardConfig.allowedWebContentsIds.includes(webContentsId)) {
    guardConfig.allowedWebContentsIds.push(webContentsId);
    logger.info(`Added webContents ID to allowed list: ${webContentsId}`);
  }
}

/**
 * Remove a webContents ID from the allowed list
 *
 * @param webContentsId - webContents ID to remove
 */
export function removeAllowedWebContentsId(webContentsId: number): void {
  if (!guardConfig.allowedWebContentsIds) {
    return;
  }
  const index = guardConfig.allowedWebContentsIds.indexOf(webContentsId);
  if (index > -1) {
    guardConfig.allowedWebContentsIds.splice(index, 1);
    logger.info(`Removed webContents ID from allowed list: ${webContentsId}`);
  }
}

/**
 * Check if a channel is in the whitelist
 *
 * @param channel - Channel to check
 * @returns true if channel is allowed
 */
export function isChannelAllowed(channel: string): boolean {
  return guardConfig.allowedChannels.includes(channel);
}

/**
 * Check if a webContents ID is allowed
 *
 * @param webContentsId - webContents ID to check
 * @returns true if source is allowed (or source validation is disabled)
 */
export function isSourceAllowed(webContentsId: number): boolean {
  if (!guardConfig.validateSource) {
    return true;
  }
  if (!guardConfig.allowedWebContentsIds || guardConfig.allowedWebContentsIds.length === 0) {
    // If no specific IDs are configured, allow all
    return true;
  }
  return guardConfig.allowedWebContentsIds.includes(webContentsId);
}

/**
 * Validate an IPC request
 *
 * @param channel - The IPC channel
 * @param webContentsId - The source webContents ID (optional)
 * @returns Validation result
 */
export function validateIpcRequest(
  channel: string,
  webContentsId?: number
): IpcValidationResult {
  // Check channel whitelist
  if (!isChannelAllowed(channel)) {
    logger.warn(`IPC request rejected - channel not allowed: ${channel}`);
    return {
      valid: false,
      reason: ERROR_MESSAGES.IPC_CHANNEL_NOT_ALLOWED,
      channel,
    };
  }

  // Check source if validation is enabled and ID is provided
  if (guardConfig.validateSource && webContentsId !== undefined) {
    if (!isSourceAllowed(webContentsId)) {
      logger.warn(`IPC request rejected - source not allowed: ${webContentsId} on channel ${channel}`);
      return {
        valid: false,
        reason: ERROR_MESSAGES.IPC_SOURCE_NOT_ALLOWED,
        channel,
      };
    }
  }

  logger.debug(`IPC request validated: ${channel}`, { webContentsId });

  return {
    valid: true,
    channel,
  };
}

/**
 * Create an IPC handler wrapper that validates requests
 *
 * @param channel - The IPC channel this handler is for
 * @param handler - The actual handler function
 * @returns Wrapped handler that validates before executing
 */
export function createGuardedHandler<T extends unknown[], R>(
  channel: string,
  handler: (...args: T) => R
): (event: { sender: { id: number } }, ...args: T) => R | { error: string } {
  return (event: { sender: { id: number } }, ...args: T): R | { error: string } => {
    const webContentsId = event.sender.id;
    const validation = validateIpcRequest(channel, webContentsId);

    if (!validation.valid) {
      return { error: validation.reason || 'Request rejected' };
    }

    return handler(...args);
  };
}

/**
 * Reset the guard configuration to defaults (for testing)
 */
export function resetIpcGuard(): void {
  guardConfig = {
    allowedChannels: [...DEFAULT_IPC_WHITELIST],
    validateSource: false,
    allowedWebContentsIds: [],
  };
}

/**
 * Enable source validation
 *
 * @param enable - Whether to enable source validation
 */
export function setSourceValidation(enable: boolean): void {
  guardConfig.validateSource = enable;
  logger.info(`IPC source validation ${enable ? 'enabled' : 'disabled'}`);
}

/**
 * Get all allowed channels
 *
 * @returns Array of allowed channel names
 */
export function getAllowedChannels(): string[] {
  return [...guardConfig.allowedChannels];
}

/**
 * Get all allowed webContents IDs
 *
 * @returns Array of allowed webContents IDs
 */
export function getAllowedWebContentsIds(): number[] {
  return [...(guardConfig.allowedWebContentsIds || [])];
}
