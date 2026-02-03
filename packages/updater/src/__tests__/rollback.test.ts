/**
 * Tests for rollback mechanism
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  initRollback,
  createBackup,
  rollbackToVersion,
  rollbackToPrevious,
  getAvailableBackups,
  hasBackup,
  getRollbackState,
  isRollingBack,
  removeBackup,
  clearAllBackups,
  updateRollbackConfig,
  resetRollbackState,
} from '../rollback';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Rollback', () => {
  let testDir: string;
  let backupDir: string;
  let sourceDir: string;

  beforeEach(() => {
    // Create temp directories
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollback-test-'));
    backupDir = path.join(testDir, 'backups');
    sourceDir = path.join(testDir, 'source');

    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });

    // Create some test files in source
    fs.writeFileSync(path.join(sourceDir, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(sourceDir, 'app.js'), 'console.log("test")');

    resetRollbackState();
    initRollback({ backupDir, maxVersions: 3 });
  });

  afterEach(() => {
    resetRollbackState();
    // Clean up temp directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initRollback', () => {
    it('should initialize with empty backups', () => {
      resetRollbackState();
      initRollback({ backupDir });

      const state = getRollbackState();
      expect(state.backups).toEqual([]);
      expect(state.isRollingBack).toBe(false);
    });

    it('should load existing backups from manifest', () => {
      // Create a backup first
      createBackup(sourceDir, '1.0.0');

      // Reinitialize
      resetRollbackState();
      initRollback({ backupDir });

      const backups = getAvailableBackups();
      expect(backups.length).toBe(1);
      expect(backups[0]?.version).toBe('1.0.0');
    });
  });

  describe('createBackup', () => {
    it('should create backup of source directory', () => {
      const result = createBackup(sourceDir, '1.0.0');

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should add backup to state', () => {
      createBackup(sourceDir, '1.0.0');

      const backups = getAvailableBackups();
      expect(backups.length).toBe(1);
      expect(backups[0]?.version).toBe('1.0.0');
    });

    it('should copy files to backup directory', () => {
      createBackup(sourceDir, '1.0.0');

      const backups = getAvailableBackups();
      const backupPath = backups[0]?.path;
      expect(backupPath).toBeDefined();

      expect(fs.existsSync(path.join(backupPath!, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(backupPath!, 'app.js'))).toBe(true);
    });

    it('should not create duplicate backup for same version', () => {
      createBackup(sourceDir, '1.0.0');
      const result = createBackup(sourceDir, '1.0.0');

      expect(result.success).toBe(true);
      expect(getAvailableBackups().length).toBe(1);
    });

    it('should cleanup old backups when max versions exceeded', () => {
      createBackup(sourceDir, '1.0.0');
      createBackup(sourceDir, '1.1.0');
      createBackup(sourceDir, '1.2.0');
      createBackup(sourceDir, '1.3.0');

      const backups = getAvailableBackups();
      expect(backups.length).toBe(3);
      expect(hasBackup('1.0.0')).toBe(false);
      expect(hasBackup('1.1.0')).toBe(true);
    });
  });

  describe('rollbackToVersion', () => {
    it('should restore files from backup', () => {
      createBackup(sourceDir, '1.0.0');

      // Modify source
      fs.writeFileSync(path.join(sourceDir, 'index.html'), '<html>modified</html>');

      // Create a new dest directory
      const destDir = path.join(testDir, 'dest');

      const result = rollbackToVersion('1.0.0', destDir);

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.0');

      const content = fs.readFileSync(path.join(destDir, 'index.html'), 'utf-8');
      expect(content).toBe('<html></html>');
    });

    it('should return error for non-existent version', () => {
      const result = rollbackToVersion('9.9.9', sourceDir);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Version not found in backups');
    });

    it('should call onBeforeRollback callback', () => {
      const onBeforeRollback = vi.fn();
      resetRollbackState();
      initRollback({ backupDir, onBeforeRollback });

      createBackup(sourceDir, '1.0.0');
      createBackup(sourceDir, '2.0.0');

      const destDir = path.join(testDir, 'dest');
      rollbackToVersion('1.0.0', destDir);

      expect(onBeforeRollback).toHaveBeenCalledWith('2.0.0', '1.0.0');
    });

    it('should call onRollbackSuccess callback', () => {
      const onRollbackSuccess = vi.fn();
      resetRollbackState();
      initRollback({ backupDir, onRollbackSuccess });

      createBackup(sourceDir, '1.0.0');

      const destDir = path.join(testDir, 'dest');
      rollbackToVersion('1.0.0', destDir);

      expect(onRollbackSuccess).toHaveBeenCalledWith('1.0.0');
    });
  });

  describe('rollbackToPrevious', () => {
    it('should rollback to the previous version', () => {
      createBackup(sourceDir, '1.0.0');
      createBackup(sourceDir, '2.0.0');

      const destDir = path.join(testDir, 'dest');
      const result = rollbackToPrevious(destDir);

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should return error when no previous version available', () => {
      createBackup(sourceDir, '1.0.0');

      const result = rollbackToPrevious(sourceDir);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No backup available for rollback');
    });
  });

  describe('getAvailableBackups', () => {
    it('should return backups sorted by timestamp descending', () => {
      createBackup(sourceDir, '1.0.0');
      createBackup(sourceDir, '2.0.0');
      createBackup(sourceDir, '3.0.0');

      const backups = getAvailableBackups();

      expect(backups.length).toBe(3);
      expect(backups[0]?.version).toBe('3.0.0');
      expect(backups[2]?.version).toBe('1.0.0');
    });
  });

  describe('hasBackup', () => {
    it('should return true for existing backup', () => {
      createBackup(sourceDir, '1.0.0');

      expect(hasBackup('1.0.0')).toBe(true);
    });

    it('should return false for non-existent backup', () => {
      expect(hasBackup('9.9.9')).toBe(false);
    });
  });

  describe('getRollbackState', () => {
    it('should return current rollback state', () => {
      createBackup(sourceDir, '1.0.0');

      const state = getRollbackState();

      expect(state.backups.length).toBe(1);
      expect(state.isRollingBack).toBe(false);
    });
  });

  describe('isRollingBack', () => {
    it('should return false when not rolling back', () => {
      expect(isRollingBack()).toBe(false);
    });
  });

  describe('removeBackup', () => {
    it('should remove specific backup', () => {
      createBackup(sourceDir, '1.0.0');
      createBackup(sourceDir, '2.0.0');

      const result = removeBackup('1.0.0');

      expect(result.success).toBe(true);
      expect(hasBackup('1.0.0')).toBe(false);
      expect(hasBackup('2.0.0')).toBe(true);
    });

    it('should return error for non-existent version', () => {
      const result = removeBackup('9.9.9');

      expect(result.success).toBe(false);
    });
  });

  describe('clearAllBackups', () => {
    it('should remove all backups', () => {
      createBackup(sourceDir, '1.0.0');
      createBackup(sourceDir, '2.0.0');

      const result = clearAllBackups();

      expect(result.success).toBe(true);
      expect(getAvailableBackups().length).toBe(0);
    });
  });

  describe('updateRollbackConfig', () => {
    it('should update configuration', () => {
      updateRollbackConfig({ maxVersions: 5 });

      // Create 5 backups
      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(path.join(sourceDir, `file${i}.txt`), `content${i}`);
        createBackup(sourceDir, `${i}.0.0`);
      }

      expect(getAvailableBackups().length).toBe(5);
    });
  });
});
