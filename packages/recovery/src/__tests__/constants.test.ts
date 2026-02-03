/**
 * Tests for constants
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CRASH_HANDLER_CONFIG,
  DEFAULT_BLANK_DETECTOR_CONFIG,
  DEFAULT_AUTO_RETRY_CONFIG,
  RESTARTABLE_CRASH_REASONS,
  NON_RESTARTABLE_CRASH_REASONS,
  ERROR_MESSAGES,
  BLANK_DETECTION_SCRIPT,
  getBlankDetectionScript,
} from '../constants';

describe('Constants', () => {
  describe('DEFAULT_CRASH_HANDLER_CONFIG', () => {
    it('should have autoRestart enabled by default', () => {
      expect(DEFAULT_CRASH_HANDLER_CONFIG.autoRestart).toBe(true);
    });

    it('should have maxRestarts of 3', () => {
      expect(DEFAULT_CRASH_HANDLER_CONFIG.maxRestarts).toBe(3);
    });

    it('should have restartWindowMs of 60000 (1 minute)', () => {
      expect(DEFAULT_CRASH_HANDLER_CONFIG.restartWindowMs).toBe(60000);
    });

    it('should have restartDelayMs of 1000 (1 second)', () => {
      expect(DEFAULT_CRASH_HANDLER_CONFIG.restartDelayMs).toBe(1000);
    });
  });

  describe('DEFAULT_BLANK_DETECTOR_CONFIG', () => {
    it('should have checkIntervalMs of 5000 (5 seconds)', () => {
      expect(DEFAULT_BLANK_DETECTOR_CONFIG.checkIntervalMs).toBe(5000);
    });

    it('should have loadTimeoutMs of 30000 (30 seconds)', () => {
      expect(DEFAULT_BLANK_DETECTOR_CONFIG.loadTimeoutMs).toBe(30000);
    });

    it('should have minContentHeight of 100 pixels', () => {
      expect(DEFAULT_BLANK_DETECTOR_CONFIG.minContentHeight).toBe(100);
    });

    it('should have blankThreshold of 3 consecutive checks', () => {
      expect(DEFAULT_BLANK_DETECTOR_CONFIG.blankThreshold).toBe(3);
    });
  });

  describe('DEFAULT_AUTO_RETRY_CONFIG', () => {
    it('should have maxRetries of 5', () => {
      expect(DEFAULT_AUTO_RETRY_CONFIG.maxRetries).toBe(5);
    });

    it('should have initialDelayMs of 1000 (1 second)', () => {
      expect(DEFAULT_AUTO_RETRY_CONFIG.initialDelayMs).toBe(1000);
    });

    it('should have maxDelayMs of 30000 (30 seconds)', () => {
      expect(DEFAULT_AUTO_RETRY_CONFIG.maxDelayMs).toBe(30000);
    });

    it('should use exponential strategy', () => {
      expect(DEFAULT_AUTO_RETRY_CONFIG.strategy).toBe('exponential');
    });

    it('should have backoffMultiplier of 2', () => {
      expect(DEFAULT_AUTO_RETRY_CONFIG.backoffMultiplier).toBe(2);
    });
  });

  describe('RESTARTABLE_CRASH_REASONS', () => {
    it('should include crashed', () => {
      expect(RESTARTABLE_CRASH_REASONS).toContain('crashed');
    });

    it('should include oom', () => {
      expect(RESTARTABLE_CRASH_REASONS).toContain('oom');
    });

    it('should include abnormal-exit', () => {
      expect(RESTARTABLE_CRASH_REASONS).toContain('abnormal-exit');
    });

    it('should not include normal-exit', () => {
      expect(RESTARTABLE_CRASH_REASONS).not.toContain('normal-exit');
    });
  });

  describe('NON_RESTARTABLE_CRASH_REASONS', () => {
    it('should include normal-exit', () => {
      expect(NON_RESTARTABLE_CRASH_REASONS).toContain('normal-exit');
    });

    it('should include killed', () => {
      expect(NON_RESTARTABLE_CRASH_REASONS).toContain('killed');
    });

    it('should include launch-failed', () => {
      expect(NON_RESTARTABLE_CRASH_REASONS).toContain('launch-failed');
    });

    it('should include integrity-failure', () => {
      expect(NON_RESTARTABLE_CRASH_REASONS).toContain('integrity-failure');
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have NO_WINDOW message', () => {
      expect(ERROR_MESSAGES.NO_WINDOW).toBe('No window provided');
    });

    it('should have NO_WEB_CONTENTS message', () => {
      expect(ERROR_MESSAGES.NO_WEB_CONTENTS).toBe('No web contents available');
    });

    it('should have MONITORING_ALREADY_ACTIVE message', () => {
      expect(ERROR_MESSAGES.MONITORING_ALREADY_ACTIVE).toBe('Monitoring is already active');
    });

    it('should have MONITORING_NOT_ACTIVE message', () => {
      expect(ERROR_MESSAGES.MONITORING_NOT_ACTIVE).toBe('Monitoring is not active');
    });

    it('should have MAX_RESTARTS_EXCEEDED message', () => {
      expect(ERROR_MESSAGES.MAX_RESTARTS_EXCEEDED).toBe('Maximum restart attempts exceeded');
    });

    it('should have MAX_RETRIES_EXCEEDED message', () => {
      expect(ERROR_MESSAGES.MAX_RETRIES_EXCEEDED).toBe('Maximum retry attempts exceeded');
    });

    it('should have RETRY_IN_PROGRESS message', () => {
      expect(ERROR_MESSAGES.RETRY_IN_PROGRESS).toBe('Retry is already in progress');
    });

    it('should have DETECTION_FAILED message', () => {
      expect(ERROR_MESSAGES.DETECTION_FAILED).toBe('Blank detection failed');
    });
  });

  describe('BLANK_DETECTION_SCRIPT', () => {
    it('should be a string', () => {
      expect(typeof BLANK_DETECTION_SCRIPT).toBe('string');
    });

    it('should be an IIFE', () => {
      expect(BLANK_DETECTION_SCRIPT).toContain('(function()');
      expect(BLANK_DETECTION_SCRIPT).toContain('})()');
    });

    it('should check for document.body', () => {
      expect(BLANK_DETECTION_SCRIPT).toContain('document.body');
    });

    it('should check body height', () => {
      expect(BLANK_DETECTION_SCRIPT).toContain('bodyHeight');
    });

    it('should return isBlank property', () => {
      expect(BLANK_DETECTION_SCRIPT).toContain('isBlank:');
    });
  });

  describe('getBlankDetectionScript', () => {
    it('should return a string', () => {
      const script = getBlankDetectionScript(100);
      expect(typeof script).toBe('string');
    });

    it('should include the provided minContentHeight', () => {
      const script = getBlankDetectionScript(200);
      expect(script).toContain('< 200');
    });

    it('should be an IIFE', () => {
      const script = getBlankDetectionScript(100);
      expect(script).toContain('(function()');
      expect(script).toContain('})()');
    });

    it('should return different scripts for different heights', () => {
      const script100 = getBlankDetectionScript(100);
      const script200 = getBlankDetectionScript(200);
      expect(script100).not.toBe(script200);
    });

    it('should check for document.body', () => {
      const script = getBlankDetectionScript(100);
      expect(script).toContain('document.body');
    });

    it('should handle errors', () => {
      const script = getBlankDetectionScript(100);
      expect(script).toContain('catch');
      expect(script).toContain('error');
    });
  });
});
