/**
 * Tests for business updater with A/B buffering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  initBusinessUpdater,
  getBusinessUpdaterState,
  getCurrentBusinessVersion,
  isBusinessUpdateAvailable,
  isBusinessUpdateReady,
  getActiveSlotPath,
  updateBusinessUpdaterConfig,
  resetBusinessUpdaterState,
} from '../business-updater';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Business Updater', () => {
  let testDir: string;
  let bufferBaseDir: string;

  beforeEach(() => {
    // Create temp directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'business-updater-test-'));
    bufferBaseDir = path.join(testDir, 'buffers');
    fs.mkdirSync(bufferBaseDir, { recursive: true });

    resetBusinessUpdaterState();
  });

  afterEach(() => {
    resetBusinessUpdaterState();
    // Clean up temp directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initBusinessUpdater', () => {
    it('should initialize with default state', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.status).toBe('idle');
      expect(state.activeSlot).toBe('A');
      expect(state.downloadProgress).toBe(0);
    });

    it('should set up slot paths', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.slotA.path).toBe(path.join(bufferBaseDir, 'slot-a'));
      expect(state.slotB.path).toBe(path.join(bufferBaseDir, 'slot-b'));
    });

    it('should set slot A as active by default', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.slotA.active).toBe(true);
      expect(state.slotB.active).toBe(false);
    });

    it('should read existing active slot from disk', () => {
      // Create active slot marker for slot B
      const markerFile = path.join(bufferBaseDir, 'active-slot.json');
      fs.writeFileSync(markerFile, JSON.stringify({ slot: 'B', timestamp: Date.now() }));

      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.activeSlot).toBe('B');
      expect(state.slotB.active).toBe(true);
    });

    it('should read existing version from active slot', () => {
      // Create slot A with version
      const slotADir = path.join(bufferBaseDir, 'slot-a');
      fs.mkdirSync(slotADir, { recursive: true });
      fs.writeFileSync(
        path.join(slotADir, 'version.json'),
        JSON.stringify({ version: '1.0.0', timestamp: Date.now() })
      );

      initBusinessUpdater({ bufferBaseDir });

      expect(getCurrentBusinessVersion()).toBe('1.0.0');
    });
  });

  describe('getBusinessUpdaterState', () => {
    it('should return current state', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state).toBeDefined();
      expect(state.status).toBeDefined();
      expect(state.activeSlot).toBeDefined();
    });
  });

  describe('getCurrentBusinessVersion', () => {
    it('should return undefined when no version installed', () => {
      initBusinessUpdater({ bufferBaseDir });

      expect(getCurrentBusinessVersion()).toBeUndefined();
    });

    it('should return version from active slot', () => {
      // Setup slot A with version
      const slotADir = path.join(bufferBaseDir, 'slot-a');
      fs.mkdirSync(slotADir, { recursive: true });
      fs.writeFileSync(
        path.join(slotADir, 'version.json'),
        JSON.stringify({ version: '2.0.0', timestamp: Date.now() })
      );

      initBusinessUpdater({ bufferBaseDir });

      expect(getCurrentBusinessVersion()).toBe('2.0.0');
    });
  });

  describe('isBusinessUpdateAvailable', () => {
    it('should return false when no update available', () => {
      initBusinessUpdater({ bufferBaseDir });

      expect(isBusinessUpdateAvailable()).toBe(false);
    });
  });

  describe('isBusinessUpdateReady', () => {
    it('should return false when no update downloaded', () => {
      initBusinessUpdater({ bufferBaseDir });

      expect(isBusinessUpdateReady()).toBe(false);
    });
  });

  describe('getActiveSlotPath', () => {
    it('should return path to active slot', () => {
      initBusinessUpdater({ bufferBaseDir });

      const slotPath = getActiveSlotPath();
      expect(slotPath).toBe(path.join(bufferBaseDir, 'slot-a'));
    });

    it('should return slot B path when slot B is active', () => {
      // Create active slot marker for slot B
      const markerFile = path.join(bufferBaseDir, 'active-slot.json');
      fs.writeFileSync(markerFile, JSON.stringify({ slot: 'B', timestamp: Date.now() }));

      initBusinessUpdater({ bufferBaseDir });

      const slotPath = getActiveSlotPath();
      expect(slotPath).toBe(path.join(bufferBaseDir, 'slot-b'));
    });
  });

  describe('updateBusinessUpdaterConfig', () => {
    it('should update configuration', () => {
      initBusinessUpdater({ bufferBaseDir });

      updateBusinessUpdaterConfig({ timeoutMs: 60000 });

      // Config update should not throw
      expect(true).toBe(true);
    });
  });

  describe('A/B buffer slots', () => {
    it('should have two slots', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.slotA).toBeDefined();
      expect(state.slotB).toBeDefined();
    });

    it('should have slot identifiers', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.slotA.slot).toBe('A');
      expect(state.slotB.slot).toBe('B');
    });

    it('should track versions in each slot', () => {
      // Setup both slots with versions
      const slotADir = path.join(bufferBaseDir, 'slot-a');
      const slotBDir = path.join(bufferBaseDir, 'slot-b');
      fs.mkdirSync(slotADir, { recursive: true });
      fs.mkdirSync(slotBDir, { recursive: true });

      fs.writeFileSync(
        path.join(slotADir, 'version.json'),
        JSON.stringify({ version: '1.0.0' })
      );
      fs.writeFileSync(
        path.join(slotBDir, 'version.json'),
        JSON.stringify({ version: '1.1.0' })
      );

      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.slotA.version).toBe('1.0.0');
      expect(state.slotB.version).toBe('1.1.0');
    });
  });

  describe('state management', () => {
    it('should start in idle status', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.status).toBe('idle');
    });

    it('should have zero download progress initially', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.downloadProgress).toBe(0);
    });

    it('should not have pending update initially', () => {
      initBusinessUpdater({ bufferBaseDir });

      const state = getBusinessUpdaterState();
      expect(state.pendingUpdate).toBeUndefined();
    });
  });
});
