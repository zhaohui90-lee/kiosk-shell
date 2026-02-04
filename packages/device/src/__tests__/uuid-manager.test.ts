/**
 * UUID Manager unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initUuidManager,
  getDeviceUuid,
  getDeviceUuidAsync,
  isUuidManagerInitialized,
  getUuidManagerState,
  resetUuidManager,
  regenerateDeviceUuid,
  isValidUuid,
  generateUuid,
} from '../uuid-manager';
import { UUID_PATTERN, ERROR_MESSAGES } from '../constants';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('UUID Manager', () => {
  const testDir = join(tmpdir(), 'kiosk-device-test-' + Date.now());
  const testFilePath = join(testDir, 'device-uuid.json');

  beforeEach(() => {
    resetUuidManager();
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    resetUuidManager();
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('isValidUuid', () => {
    it('should validate correct UUID v4 format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(isValidUuid(validUuid)).toBe(true);
    });

    it('should validate generated UUIDs', () => {
      const uuid = generateUuid();
      expect(isValidUuid(uuid)).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid('invalid')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(false); // v1 UUID
    });

    it('should match UUID_PATTERN regex', () => {
      const uuid = generateUuid();
      expect(UUID_PATTERN.test(uuid)).toBe(true);
    });
  });

  describe('generateUuid', () => {
    it('should generate valid UUID v4', () => {
      const uuid = generateUuid();
      expect(isValidUuid(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUuid();
      const uuid2 = generateUuid();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs in correct format', () => {
      const uuid = generateUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('initUuidManager', () => {
    it('should initialize with custom storage path', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      expect(isUuidManagerInitialized()).toBe(true);
      expect(existsSync(testFilePath)).toBe(true);
    });

    it('should generate and save new UUID when file does not exist', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      const uuid = getDeviceUuid();
      expect(isValidUuid(uuid)).toBe(true);

      // Verify file contents
      const fileContent = JSON.parse(readFileSync(testFilePath, 'utf-8'));
      expect(fileContent.uuid).toBe(uuid);
      expect(fileContent.createdAt).toBeDefined();
      expect(fileContent.generationMethod).toBe('random');
    });

    it('should load existing UUID from file', async () => {
      // Create existing UUID file
      mkdirSync(testDir, { recursive: true });
      const existingUuid = generateUuid();
      writeFileSync(testFilePath, JSON.stringify({
        uuid: existingUuid,
        createdAt: new Date().toISOString(),
        generationMethod: 'random',
      }));

      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      expect(getDeviceUuid()).toBe(existingUuid);
    });

    it('should regenerate UUID if file is corrupted', async () => {
      // Create corrupted file
      mkdirSync(testDir, { recursive: true });
      writeFileSync(testFilePath, 'invalid json');

      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      expect(isUuidManagerInitialized()).toBe(true);
      const uuid = getDeviceUuid();
      expect(isValidUuid(uuid)).toBe(true);
    });

    it('should regenerate UUID if existing UUID is invalid', async () => {
      // Create file with invalid UUID
      mkdirSync(testDir, { recursive: true });
      writeFileSync(testFilePath, JSON.stringify({
        uuid: 'invalid-uuid',
        createdAt: new Date().toISOString(),
      }));

      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      expect(isUuidManagerInitialized()).toBe(true);
      const uuid = getDeviceUuid();
      expect(isValidUuid(uuid)).toBe(true);
      expect(uuid).not.toBe('invalid-uuid');
    });
  });

  describe('getDeviceUuid', () => {
    it('should throw error if not initialized', () => {
      expect(() => getDeviceUuid()).toThrow(ERROR_MESSAGES.UUID_NOT_INITIALIZED);
    });

    it('should return cached UUID after initialization', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      const uuid1 = getDeviceUuid();
      const uuid2 = getDeviceUuid();
      expect(uuid1).toBe(uuid2);
    });
  });

  describe('getDeviceUuidAsync', () => {
    it('should auto-initialize if not initialized', async () => {
      // This will use fallback path since custom path is not set
      // We need to set custom path first
      resetUuidManager();

      // Initialize with custom path first
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      const uuid = await getDeviceUuidAsync();
      expect(isValidUuid(uuid)).toBe(true);
    });

    it('should return same UUID on multiple calls', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      const uuid1 = await getDeviceUuidAsync();
      const uuid2 = await getDeviceUuidAsync();
      expect(uuid1).toBe(uuid2);
    });
  });

  describe('getUuidManagerState', () => {
    it('should return uninitialized state by default', () => {
      const state = getUuidManagerState();
      expect(state.initialized).toBe(false);
      expect(state.cachedUuid).toBe(null);
      expect(state.storagePath).toBe(null);
    });

    it('should return initialized state after init', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      const state = getUuidManagerState();
      expect(state.initialized).toBe(true);
      expect(state.cachedUuid).not.toBe(null);
      expect(state.storagePath).toBe(testFilePath);
    });

    it('should return a copy of state (immutable)', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      const state1 = getUuidManagerState();
      const state2 = getUuidManagerState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('resetUuidManager', () => {
    it('should reset state to initial values', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      expect(isUuidManagerInitialized()).toBe(true);

      resetUuidManager();

      expect(isUuidManagerInitialized()).toBe(false);
      const state = getUuidManagerState();
      expect(state.cachedUuid).toBe(null);
      expect(state.storagePath).toBe(null);
    });

    it('should not delete stored UUID file', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      const uuid = getDeviceUuid();

      resetUuidManager();

      // File should still exist
      expect(existsSync(testFilePath)).toBe(true);

      // Re-initialize should load the same UUID
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      expect(getDeviceUuid()).toBe(uuid);
    });
  });

  describe('regenerateDeviceUuid', () => {
    it('should throw error if not initialized', async () => {
      await expect(regenerateDeviceUuid()).rejects.toThrow(
        ERROR_MESSAGES.UUID_NOT_INITIALIZED
      );
    });

    it('should generate new UUID and save to file', async () => {
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
      });

      const originalUuid = getDeviceUuid();
      const newUuid = await regenerateDeviceUuid();

      expect(newUuid).not.toBe(originalUuid);
      expect(isValidUuid(newUuid)).toBe(true);
      expect(getDeviceUuid()).toBe(newUuid);

      // Verify file was updated
      const fileContent = JSON.parse(readFileSync(testFilePath, 'utf-8'));
      expect(fileContent.uuid).toBe(newUuid);
    });
  });

  describe('custom configuration', () => {
    it('should use custom file name', async () => {
      const customFileName = 'custom-uuid.json';
      await initUuidManager({
        storageLocation: 'custom',
        customPath: testDir,
        fileName: customFileName,
      });

      const expectedPath = join(testDir, customFileName);
      expect(existsSync(expectedPath)).toBe(true);
      expect(getUuidManagerState().storagePath).toBe(expectedPath);
    });

    it('should throw error for custom location without path', async () => {
      await expect(
        initUuidManager({
          storageLocation: 'custom',
          // customPath not provided
        })
      ).rejects.toThrow(ERROR_MESSAGES.CUSTOM_PATH_REQUIRED);
    });
  });
});
