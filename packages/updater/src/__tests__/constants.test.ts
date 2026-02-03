/**
 * Tests for constants
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SHELL_UPDATER_CONFIG,
  DEFAULT_BUSINESS_UPDATER_CONFIG,
  DEFAULT_ROLLBACK_CONFIG,
  BUFFER_SLOTS,
  BUFFER_DIR_NAMES,
  UPDATE_STATUS,
  FILE_NAMES,
  ERROR_MESSAGES,
  TIMEOUTS,
  RETRY_CONFIG,
} from '../constants';

describe('Constants', () => {
  describe('DEFAULT_SHELL_UPDATER_CONFIG', () => {
    it('should have empty update server URL by default', () => {
      expect(DEFAULT_SHELL_UPDATER_CONFIG.updateServerUrl).toBe('');
    });

    it('should use stable channel by default', () => {
      expect(DEFAULT_SHELL_UPDATER_CONFIG.channel).toBe('stable');
    });

    it('should auto download by default', () => {
      expect(DEFAULT_SHELL_UPDATER_CONFIG.autoDownload).toBe(true);
    });

    it('should auto install on quit by default', () => {
      expect(DEFAULT_SHELL_UPDATER_CONFIG.autoInstallOnQuit).toBe(true);
    });

    it('should check every hour by default', () => {
      expect(DEFAULT_SHELL_UPDATER_CONFIG.checkIntervalMs).toBe(3600000);
    });
  });

  describe('DEFAULT_BUSINESS_UPDATER_CONFIG', () => {
    it('should have empty buffer base dir by default', () => {
      expect(DEFAULT_BUSINESS_UPDATER_CONFIG.bufferBaseDir).toBe('');
    });

    it('should have empty version check URL by default', () => {
      expect(DEFAULT_BUSINESS_UPDATER_CONFIG.versionCheckUrl).toBe('');
    });

    it('should have 30 second timeout by default', () => {
      expect(DEFAULT_BUSINESS_UPDATER_CONFIG.timeoutMs).toBe(30000);
    });

    it('should verify hash by default', () => {
      expect(DEFAULT_BUSINESS_UPDATER_CONFIG.verifyHash).toBe(true);
    });
  });

  describe('DEFAULT_ROLLBACK_CONFIG', () => {
    it('should keep 3 versions by default', () => {
      expect(DEFAULT_ROLLBACK_CONFIG.maxVersions).toBe(3);
    });

    it('should have empty backup dir by default', () => {
      expect(DEFAULT_ROLLBACK_CONFIG.backupDir).toBe('');
    });
  });

  describe('BUFFER_SLOTS', () => {
    it('should have slots A and B', () => {
      expect(BUFFER_SLOTS.A).toBe('A');
      expect(BUFFER_SLOTS.B).toBe('B');
    });
  });

  describe('BUFFER_DIR_NAMES', () => {
    it('should have correct directory names', () => {
      expect(BUFFER_DIR_NAMES.A).toBe('slot-a');
      expect(BUFFER_DIR_NAMES.B).toBe('slot-b');
    });
  });

  describe('UPDATE_STATUS', () => {
    it('should have all status values', () => {
      expect(UPDATE_STATUS.IDLE).toBe('idle');
      expect(UPDATE_STATUS.CHECKING).toBe('checking');
      expect(UPDATE_STATUS.AVAILABLE).toBe('available');
      expect(UPDATE_STATUS.NOT_AVAILABLE).toBe('not-available');
      expect(UPDATE_STATUS.DOWNLOADING).toBe('downloading');
      expect(UPDATE_STATUS.DOWNLOADED).toBe('downloaded');
      expect(UPDATE_STATUS.INSTALLING).toBe('installing');
      expect(UPDATE_STATUS.ERROR).toBe('error');
    });
  });

  describe('FILE_NAMES', () => {
    it('should have version info file name', () => {
      expect(FILE_NAMES.VERSION_INFO).toBe('version.json');
    });

    it('should have active slot file name', () => {
      expect(FILE_NAMES.ACTIVE_SLOT).toBe('active-slot.json');
    });

    it('should have backup manifest file name', () => {
      expect(FILE_NAMES.BACKUP_MANIFEST).toBe('manifest.json');
    });

    it('should have update package file name', () => {
      expect(FILE_NAMES.UPDATE_PACKAGE).toBe('update.zip');
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all error messages', () => {
      expect(ERROR_MESSAGES.NO_UPDATE_SERVER).toBeDefined();
      expect(ERROR_MESSAGES.NO_VERSION_CHECK_URL).toBeDefined();
      expect(ERROR_MESSAGES.NO_BUFFER_DIR).toBeDefined();
      expect(ERROR_MESSAGES.DOWNLOAD_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.HASH_MISMATCH).toBeDefined();
      expect(ERROR_MESSAGES.EXTRACT_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.SWITCH_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.ROLLBACK_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.NO_BACKUP_AVAILABLE).toBeDefined();
      expect(ERROR_MESSAGES.VERSION_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.BACKUP_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.ALREADY_UPDATING).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_VERSION_INFO).toBeDefined();
      expect(ERROR_MESSAGES.MIN_VERSION_NOT_MET).toBeDefined();
    });
  });

  describe('TIMEOUTS', () => {
    it('should have download timeout of 5 minutes', () => {
      expect(TIMEOUTS.DOWNLOAD).toBe(300000);
    });

    it('should have version check timeout of 10 seconds', () => {
      expect(TIMEOUTS.VERSION_CHECK).toBe(10000);
    });

    it('should have extract timeout of 1 minute', () => {
      expect(TIMEOUTS.EXTRACT).toBe(60000);
    });
  });

  describe('RETRY_CONFIG', () => {
    it('should have max 3 attempts', () => {
      expect(RETRY_CONFIG.MAX_ATTEMPTS).toBe(3);
    });

    it('should have 1 second base delay', () => {
      expect(RETRY_CONFIG.BASE_DELAY).toBe(1000);
    });

    it('should have backoff multiplier of 2', () => {
      expect(RETRY_CONFIG.BACKOFF_MULTIPLIER).toBe(2);
    });
  });
});
