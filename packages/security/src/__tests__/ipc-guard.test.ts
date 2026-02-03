/**
 * Tests for IPC guard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureIpcGuard,
  getIpcGuardConfig,
  addAllowedChannel,
  removeAllowedChannel,
  addAllowedWebContentsId,
  removeAllowedWebContentsId,
  isChannelAllowed,
  isSourceAllowed,
  validateIpcRequest,
  createGuardedHandler,
  resetIpcGuard,
  setSourceValidation,
  getAllowedChannels,
  getAllowedWebContentsIds,
} from '../ipc-guard';
import { DEFAULT_IPC_WHITELIST, ERROR_MESSAGES } from '../constants';

describe('IPC Guard', () => {
  beforeEach(() => {
    resetIpcGuard();
  });

  describe('configureIpcGuard', () => {
    it('should configure allowed channels', () => {
      configureIpcGuard({
        allowedChannels: ['custom:channel1', 'custom:channel2'],
      });
      const config = getIpcGuardConfig();
      expect(config.allowedChannels).toEqual(['custom:channel1', 'custom:channel2']);
    });

    it('should configure source validation', () => {
      configureIpcGuard({
        validateSource: true,
        allowedWebContentsIds: [1, 2, 3],
      });
      const config = getIpcGuardConfig();
      expect(config.validateSource).toBe(true);
      expect(config.allowedWebContentsIds).toEqual([1, 2, 3]);
    });

    it('should merge with existing config', () => {
      configureIpcGuard({ validateSource: true });
      configureIpcGuard({ allowedWebContentsIds: [1] });
      const config = getIpcGuardConfig();
      expect(config.validateSource).toBe(true);
      expect(config.allowedWebContentsIds).toEqual([1]);
    });
  });

  describe('getIpcGuardConfig', () => {
    it('should return default config initially', () => {
      const config = getIpcGuardConfig();
      expect(config.allowedChannels).toEqual(DEFAULT_IPC_WHITELIST);
      expect(config.validateSource).toBe(false);
    });

    it('should return a copy of the config', () => {
      const config1 = getIpcGuardConfig();
      const config2 = getIpcGuardConfig();
      expect(config1).not.toBe(config2);
      expect(config1.allowedChannels).not.toBe(config2.allowedChannels);
    });
  });

  describe('addAllowedChannel', () => {
    it('should add a new channel', () => {
      addAllowedChannel('custom:newChannel');
      expect(isChannelAllowed('custom:newChannel')).toBe(true);
    });

    it('should not duplicate existing channels', () => {
      addAllowedChannel('custom:channel');
      addAllowedChannel('custom:channel');
      const channels = getAllowedChannels();
      const count = channels.filter((c) => c === 'custom:channel').length;
      expect(count).toBe(1);
    });
  });

  describe('removeAllowedChannel', () => {
    it('should remove an existing channel', () => {
      addAllowedChannel('custom:toRemove');
      removeAllowedChannel('custom:toRemove');
      expect(isChannelAllowed('custom:toRemove')).toBe(false);
    });

    it('should do nothing for non-existing channel', () => {
      const initialCount = getAllowedChannels().length;
      removeAllowedChannel('non:existing');
      expect(getAllowedChannels().length).toBe(initialCount);
    });
  });

  describe('addAllowedWebContentsId', () => {
    it('should add a new webContents ID', () => {
      setSourceValidation(true);
      addAllowedWebContentsId(42);
      expect(getAllowedWebContentsIds()).toContain(42);
    });

    it('should not duplicate existing IDs', () => {
      addAllowedWebContentsId(42);
      addAllowedWebContentsId(42);
      const ids = getAllowedWebContentsIds();
      const count = ids.filter((id) => id === 42).length;
      expect(count).toBe(1);
    });
  });

  describe('removeAllowedWebContentsId', () => {
    it('should remove an existing webContents ID', () => {
      addAllowedWebContentsId(42);
      removeAllowedWebContentsId(42);
      expect(getAllowedWebContentsIds()).not.toContain(42);
    });

    it('should do nothing for non-existing ID', () => {
      const initialCount = getAllowedWebContentsIds().length;
      removeAllowedWebContentsId(999);
      expect(getAllowedWebContentsIds().length).toBe(initialCount);
    });
  });

  describe('isChannelAllowed', () => {
    it('should return true for default whitelist channels', () => {
      for (const channel of DEFAULT_IPC_WHITELIST) {
        expect(isChannelAllowed(channel)).toBe(true);
      }
    });

    it('should return false for non-whitelisted channels', () => {
      expect(isChannelAllowed('unknown:channel')).toBe(false);
    });
  });

  describe('isSourceAllowed', () => {
    it('should return true when source validation is disabled', () => {
      setSourceValidation(false);
      expect(isSourceAllowed(999)).toBe(true);
    });

    it('should return true when no specific IDs are configured', () => {
      setSourceValidation(true);
      expect(isSourceAllowed(999)).toBe(true);
    });

    it('should return true for allowed webContents ID', () => {
      setSourceValidation(true);
      addAllowedWebContentsId(42);
      expect(isSourceAllowed(42)).toBe(true);
    });

    it('should return false for disallowed webContents ID', () => {
      setSourceValidation(true);
      addAllowedWebContentsId(42);
      expect(isSourceAllowed(999)).toBe(false);
    });
  });

  describe('validateIpcRequest', () => {
    it('should return valid for allowed channel', () => {
      const result = validateIpcRequest('shell:systemShutdown');
      expect(result.valid).toBe(true);
      expect(result.channel).toBe('shell:systemShutdown');
    });

    it('should return invalid for disallowed channel', () => {
      const result = validateIpcRequest('unknown:channel');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe(ERROR_MESSAGES.IPC_CHANNEL_NOT_ALLOWED);
      expect(result.channel).toBe('unknown:channel');
    });

    it('should validate source when enabled', () => {
      setSourceValidation(true);
      addAllowedWebContentsId(42);

      const valid = validateIpcRequest('shell:systemShutdown', 42);
      expect(valid.valid).toBe(true);

      const invalid = validateIpcRequest('shell:systemShutdown', 999);
      expect(invalid.valid).toBe(false);
      expect(invalid.reason).toBe(ERROR_MESSAGES.IPC_SOURCE_NOT_ALLOWED);
    });

    it('should skip source validation when not provided', () => {
      setSourceValidation(true);
      addAllowedWebContentsId(42);

      const result = validateIpcRequest('shell:systemShutdown');
      expect(result.valid).toBe(true);
    });
  });

  describe('createGuardedHandler', () => {
    it('should create a handler that validates requests', () => {
      const handler = vi.fn().mockReturnValue('success');
      const guarded = createGuardedHandler('shell:systemShutdown', handler);

      const event = { sender: { id: 1 } };
      const result = guarded(event, 'arg1', 'arg2');

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('success');
    });

    it('should return error for disallowed channel', () => {
      const handler = vi.fn().mockReturnValue('success');
      const guarded = createGuardedHandler('unknown:channel', handler);

      const event = { sender: { id: 1 } };
      const result = guarded(event) as { error: string };

      expect(handler).not.toHaveBeenCalled();
      expect(result.error).toBe(ERROR_MESSAGES.IPC_CHANNEL_NOT_ALLOWED);
    });

    it('should return error for disallowed source', () => {
      setSourceValidation(true);
      addAllowedWebContentsId(42);

      const handler = vi.fn().mockReturnValue('success');
      const guarded = createGuardedHandler('shell:systemShutdown', handler);

      const event = { sender: { id: 999 } };
      const result = guarded(event) as { error: string };

      expect(handler).not.toHaveBeenCalled();
      expect(result.error).toBe(ERROR_MESSAGES.IPC_SOURCE_NOT_ALLOWED);
    });
  });

  describe('resetIpcGuard', () => {
    it('should reset to default configuration', () => {
      configureIpcGuard({
        allowedChannels: ['custom:channel'],
        validateSource: true,
        allowedWebContentsIds: [1, 2, 3],
      });

      resetIpcGuard();

      const config = getIpcGuardConfig();
      expect(config.allowedChannels).toEqual(DEFAULT_IPC_WHITELIST);
      expect(config.validateSource).toBe(false);
      expect(config.allowedWebContentsIds).toEqual([]);
    });
  });

  describe('setSourceValidation', () => {
    it('should enable source validation', () => {
      setSourceValidation(true);
      expect(getIpcGuardConfig().validateSource).toBe(true);
    });

    it('should disable source validation', () => {
      setSourceValidation(true);
      setSourceValidation(false);
      expect(getIpcGuardConfig().validateSource).toBe(false);
    });
  });

  describe('getAllowedChannels', () => {
    it('should return a copy of allowed channels', () => {
      const channels1 = getAllowedChannels();
      const channels2 = getAllowedChannels();
      expect(channels1).not.toBe(channels2);
      expect(channels1).toEqual(channels2);
    });
  });

  describe('getAllowedWebContentsIds', () => {
    it('should return a copy of allowed webContents IDs', () => {
      addAllowedWebContentsId(1);
      addAllowedWebContentsId(2);
      const ids1 = getAllowedWebContentsIds();
      const ids2 = getAllowedWebContentsIds();
      expect(ids1).not.toBe(ids2);
      expect(ids1).toEqual(ids2);
    });
  });
});

// Import vi for mocking
import { vi } from 'vitest';
