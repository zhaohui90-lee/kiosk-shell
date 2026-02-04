/**
 * Constants unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MONITOR_CONFIG,
  DEFAULT_HEARTBEAT_CONFIG,
  CONFIG_LIMITS,
  INITIAL_BACKOFF_DELAY,
  BACKOFF_MULTIPLIER,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  WINDOWS_PROCESS_STATES,
  IPC_MESSAGE_TYPES,
} from '../constants';

describe('Watchdog Constants', () => {
  describe('DEFAULT_MONITOR_CONFIG', () => {
    it('should have valid check interval', () => {
      expect(DEFAULT_MONITOR_CONFIG.checkInterval).toBeGreaterThanOrEqual(
        CONFIG_LIMITS.MIN_CHECK_INTERVAL
      );
      expect(DEFAULT_MONITOR_CONFIG.checkInterval).toBeLessThanOrEqual(
        CONFIG_LIMITS.MAX_CHECK_INTERVAL
      );
    });

    it('should have auto restart enabled by default', () => {
      expect(DEFAULT_MONITOR_CONFIG.autoRestart).toBe(true);
    });

    it('should use exponential-backoff strategy by default', () => {
      expect(DEFAULT_MONITOR_CONFIG.restartStrategy).toBe('exponential-backoff');
    });

    it('should have reasonable max restart attempts', () => {
      expect(DEFAULT_MONITOR_CONFIG.maxRestartAttempts).toBeGreaterThan(0);
    });

    it('should have valid restart delay', () => {
      expect(DEFAULT_MONITOR_CONFIG.restartDelay).toBeGreaterThanOrEqual(
        CONFIG_LIMITS.MIN_RESTART_DELAY
      );
    });

    it('should have valid max backoff delay', () => {
      expect(DEFAULT_MONITOR_CONFIG.maxBackoffDelay).toBeGreaterThan(
        INITIAL_BACKOFF_DELAY
      );
    });
  });

  describe('DEFAULT_HEARTBEAT_CONFIG', () => {
    it('should have valid heartbeat interval', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.interval).toBeGreaterThanOrEqual(
        CONFIG_LIMITS.MIN_HEARTBEAT_INTERVAL
      );
      expect(DEFAULT_HEARTBEAT_CONFIG.interval).toBeLessThanOrEqual(
        CONFIG_LIMITS.MAX_HEARTBEAT_INTERVAL
      );
    });

    it('should have valid heartbeat timeout', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.timeout).toBeGreaterThanOrEqual(
        CONFIG_LIMITS.MIN_HEARTBEAT_TIMEOUT
      );
      expect(DEFAULT_HEARTBEAT_CONFIG.timeout).toBeLessThanOrEqual(
        CONFIG_LIMITS.MAX_HEARTBEAT_TIMEOUT
      );
    });

    it('should have timeout greater than interval', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.timeout).toBeGreaterThan(
        DEFAULT_HEARTBEAT_CONFIG.interval
      );
    });

    it('should have valid missed threshold', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.missedThreshold).toBeGreaterThanOrEqual(
        CONFIG_LIMITS.MIN_MISSED_THRESHOLD
      );
      expect(DEFAULT_HEARTBEAT_CONFIG.missedThreshold).toBeLessThanOrEqual(
        CONFIG_LIMITS.MAX_MISSED_THRESHOLD
      );
    });

    it('should have IPC channel defined', () => {
      expect(typeof DEFAULT_HEARTBEAT_CONFIG.ipcChannel).toBe('string');
      expect(DEFAULT_HEARTBEAT_CONFIG.ipcChannel.length).toBeGreaterThan(0);
    });
  });

  describe('CONFIG_LIMITS', () => {
    it('should have min < max for check interval', () => {
      expect(CONFIG_LIMITS.MIN_CHECK_INTERVAL).toBeLessThan(
        CONFIG_LIMITS.MAX_CHECK_INTERVAL
      );
    });

    it('should have min < max for heartbeat interval', () => {
      expect(CONFIG_LIMITS.MIN_HEARTBEAT_INTERVAL).toBeLessThan(
        CONFIG_LIMITS.MAX_HEARTBEAT_INTERVAL
      );
    });

    it('should have min < max for heartbeat timeout', () => {
      expect(CONFIG_LIMITS.MIN_HEARTBEAT_TIMEOUT).toBeLessThan(
        CONFIG_LIMITS.MAX_HEARTBEAT_TIMEOUT
      );
    });

    it('should have min < max for restart delay', () => {
      expect(CONFIG_LIMITS.MIN_RESTART_DELAY).toBeLessThan(
        CONFIG_LIMITS.MAX_RESTART_DELAY
      );
    });

    it('should have min < max for missed threshold', () => {
      expect(CONFIG_LIMITS.MIN_MISSED_THRESHOLD).toBeLessThan(
        CONFIG_LIMITS.MAX_MISSED_THRESHOLD
      );
    });

    it('should have positive minimums', () => {
      expect(CONFIG_LIMITS.MIN_CHECK_INTERVAL).toBeGreaterThan(0);
      expect(CONFIG_LIMITS.MIN_HEARTBEAT_INTERVAL).toBeGreaterThan(0);
      expect(CONFIG_LIMITS.MIN_HEARTBEAT_TIMEOUT).toBeGreaterThan(0);
      expect(CONFIG_LIMITS.MIN_RESTART_DELAY).toBeGreaterThan(0);
      expect(CONFIG_LIMITS.MIN_MISSED_THRESHOLD).toBeGreaterThan(0);
    });
  });

  describe('INITIAL_BACKOFF_DELAY', () => {
    it('should be positive', () => {
      expect(INITIAL_BACKOFF_DELAY).toBeGreaterThan(0);
    });

    it('should be less than max backoff', () => {
      expect(INITIAL_BACKOFF_DELAY).toBeLessThan(
        DEFAULT_MONITOR_CONFIG.maxBackoffDelay
      );
    });
  });

  describe('BACKOFF_MULTIPLIER', () => {
    it('should be greater than 1', () => {
      expect(BACKOFF_MULTIPLIER).toBeGreaterThan(1);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all required error messages', () => {
      expect(ERROR_MESSAGES.NOT_INITIALIZED).toBeDefined();
      expect(ERROR_MESSAGES.ALREADY_MONITORING).toBeDefined();
      expect(ERROR_MESSAGES.NOT_MONITORING).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_PID).toBeDefined();
      expect(ERROR_MESSAGES.PROCESS_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.RESTART_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.MAX_RESTARTS_REACHED).toBeDefined();
      expect(ERROR_MESSAGES.HEARTBEAT_NOT_ACTIVE).toBeDefined();
      expect(ERROR_MESSAGES.WINDOWS_ONLY).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_CONFIG).toBeDefined();
      expect(ERROR_MESSAGES.NO_EXECUTABLE_PATH).toBeDefined();
    });

    it('should have non-empty messages', () => {
      for (const message of Object.values(ERROR_MESSAGES)) {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('LOG_MESSAGES', () => {
    it('should have all required log messages', () => {
      expect(LOG_MESSAGES.MONITORING_STARTED).toBeDefined();
      expect(LOG_MESSAGES.MONITORING_STOPPED).toBeDefined();
      expect(LOG_MESSAGES.PROCESS_RUNNING).toBeDefined();
      expect(LOG_MESSAGES.PROCESS_STOPPED).toBeDefined();
      expect(LOG_MESSAGES.PROCESS_CRASHED).toBeDefined();
      expect(LOG_MESSAGES.PROCESS_UNRESPONSIVE).toBeDefined();
      expect(LOG_MESSAGES.RESTARTING_PROCESS).toBeDefined();
      expect(LOG_MESSAGES.RESTART_SUCCESSFUL).toBeDefined();
      expect(LOG_MESSAGES.RESTART_FAILED).toBeDefined();
      expect(LOG_MESSAGES.HEARTBEAT_RECEIVED).toBeDefined();
      expect(LOG_MESSAGES.HEARTBEAT_MISSED).toBeDefined();
      expect(LOG_MESSAGES.MAX_RESTARTS_REACHED).toBeDefined();
    });

    it('should have non-empty messages', () => {
      for (const message of Object.values(LOG_MESSAGES)) {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('WINDOWS_PROCESS_STATES', () => {
    it('should have running state', () => {
      expect(WINDOWS_PROCESS_STATES.RUNNING).toBeDefined();
    });

    it('should have not responding state', () => {
      expect(WINDOWS_PROCESS_STATES.NOT_RESPONDING).toBeDefined();
    });
  });

  describe('IPC_MESSAGE_TYPES', () => {
    it('should have heartbeat ping', () => {
      expect(IPC_MESSAGE_TYPES.HEARTBEAT_PING).toBeDefined();
      expect(typeof IPC_MESSAGE_TYPES.HEARTBEAT_PING).toBe('string');
    });

    it('should have heartbeat pong', () => {
      expect(IPC_MESSAGE_TYPES.HEARTBEAT_PONG).toBeDefined();
      expect(typeof IPC_MESSAGE_TYPES.HEARTBEAT_PONG).toBe('string');
    });

    it('should have status request', () => {
      expect(IPC_MESSAGE_TYPES.STATUS_REQUEST).toBeDefined();
      expect(typeof IPC_MESSAGE_TYPES.STATUS_REQUEST).toBe('string');
    });

    it('should have status response', () => {
      expect(IPC_MESSAGE_TYPES.STATUS_RESPONSE).toBeDefined();
      expect(typeof IPC_MESSAGE_TYPES.STATUS_RESPONSE).toBe('string');
    });

    it('should have unique message types', () => {
      const types = Object.values(IPC_MESSAGE_TYPES);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });
  });
});
