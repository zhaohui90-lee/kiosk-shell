/**
 * Tests for types and constants
 */

import { describe, it, expect } from 'vitest';
import {
  CURRENT_PLATFORM,
  DEFAULT_BLOCKED_SHORTCUTS,
  DEVTOOLS_SHORTCUTS,
  DEFAULT_IPC_WHITELIST,
  DEFAULT_KIOSK_CONFIG,
  ERROR_MESSAGES,
} from '../constants';

describe('Constants', () => {
  describe('CURRENT_PLATFORM', () => {
    it('should be either win32 or darwin', () => {
      expect(['win32', 'darwin']).toContain(CURRENT_PLATFORM);
    });
  });

  describe('DEFAULT_BLOCKED_SHORTCUTS', () => {
    it('should be an array of shortcuts', () => {
      expect(Array.isArray(DEFAULT_BLOCKED_SHORTCUTS)).toBe(true);
      expect(DEFAULT_BLOCKED_SHORTCUTS.length).toBeGreaterThan(0);
    });

    it('should have valid shortcut structure', () => {
      for (const shortcut of DEFAULT_BLOCKED_SHORTCUTS) {
        expect(shortcut).toHaveProperty('accelerator');
        expect(shortcut).toHaveProperty('description');
        expect(shortcut).toHaveProperty('platforms');
        expect(typeof shortcut.accelerator).toBe('string');
        expect(typeof shortcut.description).toBe('string');
        expect(Array.isArray(shortcut.platforms)).toBe(true);
      }
    });

    it('should include common dangerous shortcuts', () => {
      const accelerators = DEFAULT_BLOCKED_SHORTCUTS.map((s) => s.accelerator);
      expect(accelerators).toContain('Alt+F4');
      expect(accelerators).toContain('Cmd+Q');
      expect(accelerators).toContain('F5');
    });

    it('should have valid platform values', () => {
      for (const shortcut of DEFAULT_BLOCKED_SHORTCUTS) {
        for (const platform of shortcut.platforms) {
          expect(['win32', 'darwin']).toContain(platform);
        }
      }
    });
  });

  describe('DEVTOOLS_SHORTCUTS', () => {
    it('should be an array of shortcuts', () => {
      expect(Array.isArray(DEVTOOLS_SHORTCUTS)).toBe(true);
      expect(DEVTOOLS_SHORTCUTS.length).toBeGreaterThan(0);
    });

    it('should include F12', () => {
      const accelerators = DEVTOOLS_SHORTCUTS.map((s) => s.accelerator);
      expect(accelerators).toContain('F12');
    });

    it('should include platform-specific DevTools shortcuts', () => {
      const accelerators = DEVTOOLS_SHORTCUTS.map((s) => s.accelerator);
      expect(accelerators).toContain('Ctrl+Shift+I');
      expect(accelerators).toContain('Cmd+Option+I');
    });
  });

  describe('DEFAULT_IPC_WHITELIST', () => {
    it('should be an array of channel names', () => {
      expect(Array.isArray(DEFAULT_IPC_WHITELIST)).toBe(true);
      expect(DEFAULT_IPC_WHITELIST.length).toBeGreaterThan(0);
    });

    it('should include expected channels', () => {
      expect(DEFAULT_IPC_WHITELIST).toContain('shell:systemShutdown');
      expect(DEFAULT_IPC_WHITELIST).toContain('shell:systemRestart');
      expect(DEFAULT_IPC_WHITELIST).toContain('shell:getDeviceInfo');
      expect(DEFAULT_IPC_WHITELIST).toContain('shell:requestUpdate');
      expect(DEFAULT_IPC_WHITELIST).toContain('shell:openDevTools');
    });

    it('should have channel names starting with shell:', () => {
      for (const channel of DEFAULT_IPC_WHITELIST) {
        expect(channel.startsWith('shell:')).toBe(true);
      }
    });
  });

  describe('DEFAULT_KIOSK_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_KIOSK_CONFIG.blockShortcuts).toBe(true);
      expect(DEFAULT_KIOSK_CONFIG.fullscreen).toBe(true);
      expect(DEFAULT_KIOSK_CONFIG.alwaysOnTop).toBe(true);
      expect(DEFAULT_KIOSK_CONFIG.disableMenuBar).toBe(true);
      expect(DEFAULT_KIOSK_CONFIG.allowDevTools).toBe(false);
      expect(DEFAULT_KIOSK_CONFIG.exitPassword).toBeUndefined();
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all expected error messages', () => {
      expect(ERROR_MESSAGES.NO_WINDOW).toBeDefined();
      expect(ERROR_MESSAGES.SHORTCUT_ALREADY_REGISTERED).toBeDefined();
      expect(ERROR_MESSAGES.KIOSK_MODE_ALREADY_ENABLED).toBeDefined();
      expect(ERROR_MESSAGES.KIOSK_MODE_NOT_ENABLED).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_PASSWORD).toBeDefined();
      expect(ERROR_MESSAGES.IPC_CHANNEL_NOT_ALLOWED).toBeDefined();
      expect(ERROR_MESSAGES.IPC_SOURCE_NOT_ALLOWED).toBeDefined();
    });

    it('should have non-empty error messages', () => {
      for (const message of Object.values(ERROR_MESSAGES)) {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });
});
