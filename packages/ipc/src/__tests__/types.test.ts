/**
 * Types and constants unit tests
 */

import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS, RATE_LIMITS } from '../types';
import {
  DEFAULT_DEBUG_PASSWORD,
  SHELL_API_NAMESPACE,
  PRELOAD_CONFIG,
  ERROR_MESSAGES,
} from '../constants';

describe('IPC Types and Constants', () => {
  describe('IPC_CHANNELS', () => {
    it('should have correct channel names', () => {
      expect(IPC_CHANNELS.SYSTEM_SHUTDOWN).toBe('shell:systemShutdown');
      expect(IPC_CHANNELS.SYSTEM_RESTART).toBe('shell:systemRestart');
      expect(IPC_CHANNELS.GET_DEVICE_INFO).toBe('shell:getDeviceInfo');
      expect(IPC_CHANNELS.REQUEST_UPDATE).toBe('shell:requestUpdate');
      expect(IPC_CHANNELS.OPEN_DEV_TOOLS).toBe('shell:openDevTools');
    });

    it('should have all expected channels', () => {
      const expectedChannels = [
        'SYSTEM_SHUTDOWN',
        'SYSTEM_RESTART',
        'GET_DEVICE_INFO',
        'REQUEST_UPDATE',
        'OPEN_DEV_TOOLS',
      ];

      expectedChannels.forEach((channel) => {
        expect(IPC_CHANNELS).toHaveProperty(channel);
      });
    });

    it('should use shell: prefix for all channels', () => {
      Object.values(IPC_CHANNELS).forEach((channel) => {
        expect(channel).toMatch(/^shell:/);
      });
    });
  });

  describe('RATE_LIMITS', () => {
    it('should have rate limits for system operations', () => {
      expect(RATE_LIMITS[IPC_CHANNELS.SYSTEM_SHUTDOWN]).toBeDefined();
      expect(RATE_LIMITS[IPC_CHANNELS.SYSTEM_RESTART]).toBeDefined();
    });

    it('should have strict limits for shutdown/restart', () => {
      const shutdownLimit = RATE_LIMITS[IPC_CHANNELS.SYSTEM_SHUTDOWN];
      const restartLimit = RATE_LIMITS[IPC_CHANNELS.SYSTEM_RESTART];

      expect(shutdownLimit?.maxCalls).toBe(1);
      expect(shutdownLimit?.windowMs).toBe(60000);
      expect(restartLimit?.maxCalls).toBe(1);
      expect(restartLimit?.windowMs).toBe(60000);
    });

    it('should have rate limit for DevTools', () => {
      const devToolsLimit = RATE_LIMITS[IPC_CHANNELS.OPEN_DEV_TOOLS];

      expect(devToolsLimit).toBeDefined();
      expect(devToolsLimit?.maxCalls).toBeGreaterThan(1);
    });

    it('should not have rate limits for device info', () => {
      expect(RATE_LIMITS[IPC_CHANNELS.GET_DEVICE_INFO]).toBeUndefined();
    });
  });

  describe('Constants', () => {
    it('should have default debug password', () => {
      expect(DEFAULT_DEBUG_PASSWORD).toBeDefined();
      expect(typeof DEFAULT_DEBUG_PASSWORD).toBe('string');
      expect(DEFAULT_DEBUG_PASSWORD.length).toBeGreaterThanOrEqual(8);
    });

    it('should have shell API namespace', () => {
      expect(SHELL_API_NAMESPACE).toBe('shellAPI');
    });

    it('should have secure preload config', () => {
      expect(PRELOAD_CONFIG.contextIsolation).toBe(true);
      expect(PRELOAD_CONFIG.nodeIntegration).toBe(false);
      expect(PRELOAD_CONFIG.sandbox).toBe(true);
    });

    it('should have error messages', () => {
      expect(ERROR_MESSAGES.RATE_LIMITED).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_CHANNEL).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_PASSWORD).toBeDefined();
      expect(ERROR_MESSAGES.OPERATION_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.NOT_INITIALIZED).toBeDefined();
    });
  });
});
