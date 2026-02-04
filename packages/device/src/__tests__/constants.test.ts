/**
 * Constants unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_UUID_MANAGER_CONFIG,
  DEFAULT_HARDWARE_INFO_CONFIG,
  UUID_PATTERN,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  STORAGE_PATHS,
  VALIDATION,
} from '../constants';

describe('Device Constants', () => {
  describe('DEFAULT_UUID_MANAGER_CONFIG', () => {
    it('should have valid storage location', () => {
      expect(['userData', 'appData', 'custom']).toContain(
        DEFAULT_UUID_MANAGER_CONFIG.storageLocation
      );
    });

    it('should have default file name', () => {
      expect(DEFAULT_UUID_MANAGER_CONFIG.fileName).toBe('device-uuid.json');
    });

    it('should have valid generation method', () => {
      expect(['random', 'hardware-based']).toContain(
        DEFAULT_UUID_MANAGER_CONFIG.generationMethod
      );
    });

    it('should cache in memory by default', () => {
      expect(DEFAULT_UUID_MANAGER_CONFIG.cacheInMemory).toBe(true);
    });
  });

  describe('DEFAULT_HARDWARE_INFO_CONFIG', () => {
    it('should include network by default', () => {
      expect(DEFAULT_HARDWARE_INFO_CONFIG.includeNetwork).toBe(true);
    });

    it('should include displays by default', () => {
      expect(DEFAULT_HARDWARE_INFO_CONFIG.includeDisplays).toBe(true);
    });

    it('should exclude internal interfaces by default', () => {
      expect(DEFAULT_HARDWARE_INFO_CONFIG.includeInternalInterfaces).toBe(false);
    });
  });

  describe('UUID_PATTERN', () => {
    it('should match valid UUID v4', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d4-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      for (const uuid of validUuids) {
        expect(UUID_PATTERN.test(uuid)).toBe(true);
      }
    });

    it('should not match UUID v1', () => {
      const v1Uuid = '550e8400-e29b-11d4-a716-446655440000';
      expect(UUID_PATTERN.test(v1Uuid)).toBe(false);
    });

    it('should not match invalid strings', () => {
      const invalidStrings = [
        '',
        'invalid',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400-e29b-41d4-a716-4466554400001', // too long
        '550e8400-e29b-41d4-c716-446655440000', // wrong variant
      ];

      for (const str of invalidStrings) {
        expect(UUID_PATTERN.test(str)).toBe(false);
      }
    });

    it('should be case insensitive', () => {
      expect(UUID_PATTERN.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      expect(UUID_PATTERN.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all required error messages', () => {
      expect(ERROR_MESSAGES.UUID_NOT_INITIALIZED).toBeDefined();
      expect(ERROR_MESSAGES.UUID_STORAGE_READ_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.UUID_STORAGE_WRITE_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.UUID_INVALID_FORMAT).toBeDefined();
      expect(ERROR_MESSAGES.UUID_FILE_CORRUPTED).toBeDefined();
      expect(ERROR_MESSAGES.HARDWARE_INFO_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.DISPLAY_INFO_UNAVAILABLE).toBeDefined();
      expect(ERROR_MESSAGES.CUSTOM_PATH_REQUIRED).toBeDefined();
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
      expect(LOG_MESSAGES.UUID_INITIALIZED).toBeDefined();
      expect(LOG_MESSAGES.UUID_GENERATED).toBeDefined();
      expect(LOG_MESSAGES.UUID_LOADED).toBeDefined();
      expect(LOG_MESSAGES.UUID_SAVED).toBeDefined();
      expect(LOG_MESSAGES.HARDWARE_INFO_COLLECTED).toBeDefined();
    });

    it('should have non-empty messages', () => {
      for (const message of Object.values(LOG_MESSAGES)) {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('STORAGE_PATHS', () => {
    it('should have paths for all supported platforms', () => {
      expect(STORAGE_PATHS.win32).toBeDefined();
      expect(STORAGE_PATHS.darwin).toBeDefined();
      expect(STORAGE_PATHS.linux).toBeDefined();
    });

    it('should have non-empty paths', () => {
      expect(STORAGE_PATHS.win32.length).toBeGreaterThan(0);
      expect(STORAGE_PATHS.darwin.length).toBeGreaterThan(0);
      expect(STORAGE_PATHS.linux.length).toBeGreaterThan(0);
    });
  });

  describe('VALIDATION', () => {
    it('should have reasonable memory limits', () => {
      expect(VALIDATION.MIN_MEMORY_BYTES).toBeLessThan(VALIDATION.MAX_MEMORY_BYTES);
      expect(VALIDATION.MIN_MEMORY_BYTES).toBeGreaterThan(0);
    });

    it('should have reasonable CPU core limits', () => {
      expect(VALIDATION.MIN_CPU_CORES).toBeLessThan(VALIDATION.MAX_CPU_CORES);
      expect(VALIDATION.MIN_CPU_CORES).toBeGreaterThanOrEqual(1);
    });

    it('should have min memory at least 1MB', () => {
      expect(VALIDATION.MIN_MEMORY_BYTES).toBeGreaterThanOrEqual(1024 * 1024);
    });

    it('should have max memory at least 1GB', () => {
      expect(VALIDATION.MAX_MEMORY_BYTES).toBeGreaterThanOrEqual(1024 * 1024 * 1024);
    });
  });
});
