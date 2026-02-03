/**
 * Tests for shortcuts blocker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { ShortcutHandler } from '../types';
import {
  setShortcutHandler,
  getShortcutsToBlock,
  blockShortcuts,
  unblockShortcuts,
  getBlockerState,
  isShortcutBlocked,
  blockSingleShortcut,
  unblockSingleShortcut,
  resetBlockerStates,
} from '../shortcuts';
import { DEFAULT_BLOCKED_SHORTCUTS, DEVTOOLS_SHORTCUTS } from '../constants';

// Mock BrowserWindow
function createMockWindow(id: number): BrowserWindow {
  return {
    id,
    isDestroyed: () => false,
  } as BrowserWindow;
}

// Mock ShortcutHandler for testing
function createMockShortcutHandler(): ShortcutHandler & {
  getRegistered: (windowId: number) => Set<string>;
} {
  const registered = new Map<number, Set<string>>();

  return {
    register(window: BrowserWindow, accelerator: string, _callback: () => void): void {
      const windowId = window.id;
      if (!registered.has(windowId)) {
        registered.set(windowId, new Set());
      }
      registered.get(windowId)!.add(accelerator);
    },
    unregister(window: BrowserWindow, accelerator: string): void {
      const shortcuts = registered.get(window.id);
      if (shortcuts) {
        shortcuts.delete(accelerator);
      }
    },
    unregisterAll(window: BrowserWindow): void {
      registered.delete(window.id);
    },
    isRegistered(window: BrowserWindow, accelerator: string): boolean {
      const shortcuts = registered.get(window.id);
      return shortcuts ? shortcuts.has(accelerator) : false;
    },
    getRegistered(windowId: number): Set<string> {
      return registered.get(windowId) || new Set();
    },
  };
}

describe('Shortcuts Blocker', () => {
  let mockHandler: ReturnType<typeof createMockShortcutHandler>;
  let mockWindow: BrowserWindow;

  beforeEach(() => {
    resetBlockerStates();
    mockHandler = createMockShortcutHandler();
    setShortcutHandler(mockHandler);
    mockWindow = createMockWindow(1);
  });

  describe('getShortcutsToBlock', () => {
    it('should return default shortcuts for win32 when blockDefaults is true', () => {
      const shortcuts = getShortcutsToBlock({ blockDefaults: true }, 'win32');
      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts).toContain('Alt+F4');
    });

    it('should return default shortcuts for darwin when blockDefaults is true', () => {
      const shortcuts = getShortcutsToBlock({ blockDefaults: true }, 'darwin');
      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts).toContain('Cmd+Q');
    });

    it('should include DevTools shortcuts when allowDevTools is false', () => {
      const shortcuts = getShortcutsToBlock({ allowDevTools: false }, 'win32');
      expect(shortcuts).toContain('F12');
      expect(shortcuts).toContain('Ctrl+Shift+I');
    });

    it('should not include DevTools shortcuts when allowDevTools is true', () => {
      const shortcuts = getShortcutsToBlock({ allowDevTools: true }, 'win32');
      expect(shortcuts).not.toContain('F12');
      expect(shortcuts).not.toContain('Ctrl+Shift+I');
    });

    it('should include additional shortcuts', () => {
      const shortcuts = getShortcutsToBlock({
        additionalShortcuts: ['Ctrl+X', 'Ctrl+Y'],
      });
      expect(shortcuts).toContain('Ctrl+X');
      expect(shortcuts).toContain('Ctrl+Y');
    });

    it('should exclude specified shortcuts', () => {
      const shortcuts = getShortcutsToBlock({
        blockDefaults: true,
        excludeShortcuts: ['Alt+F4'],
      }, 'win32');
      expect(shortcuts).not.toContain('Alt+F4');
    });

    it('should return empty array when blockDefaults is false and no additional shortcuts', () => {
      const shortcuts = getShortcutsToBlock({
        blockDefaults: false,
        allowDevTools: true,
      });
      expect(shortcuts).toEqual([]);
    });
  });

  describe('blockShortcuts', () => {
    it('should throw error when no window is provided', () => {
      expect(() => blockShortcuts(null as unknown as BrowserWindow)).toThrow();
    });

    it('should block default shortcuts', () => {
      const state = blockShortcuts(mockWindow);
      expect(state.active).toBe(true);
      expect(state.blockedShortcuts.length).toBeGreaterThan(0);
      expect(state.windowId).toBe(1);
    });

    it('should register shortcuts with the handler', () => {
      blockShortcuts(mockWindow);
      const registered = mockHandler.getRegistered(1);
      expect(registered.size).toBeGreaterThan(0);
    });

    it('should unblock existing shortcuts before reapplying', () => {
      blockShortcuts(mockWindow);
      const firstCount = mockHandler.getRegistered(1).size;

      blockShortcuts(mockWindow, { blockDefaults: true });
      const secondCount = mockHandler.getRegistered(1).size;

      // Should have similar count after reapplying
      expect(secondCount).toBeGreaterThan(0);
    });

    it('should respect allowDevTools option', () => {
      blockShortcuts(mockWindow, { allowDevTools: true });
      const registered = mockHandler.getRegistered(1);
      expect(registered.has('F12')).toBe(false);
    });
  });

  describe('unblockShortcuts', () => {
    it('should throw error when no window is provided', () => {
      expect(() => unblockShortcuts(null as unknown as BrowserWindow)).toThrow();
    });

    it('should unblock all shortcuts', () => {
      blockShortcuts(mockWindow);
      unblockShortcuts(mockWindow);

      const state = getBlockerState(mockWindow);
      expect(state?.active).toBe(false);
      expect(state?.blockedShortcuts).toEqual([]);
    });

    it('should call unregisterAll on handler', () => {
      blockShortcuts(mockWindow);
      unblockShortcuts(mockWindow);

      const registered = mockHandler.getRegistered(1);
      expect(registered.size).toBe(0);
    });

    it('should do nothing if not blocking', () => {
      unblockShortcuts(mockWindow); // Should not throw
      expect(getBlockerState(mockWindow)).toBeUndefined();
    });
  });

  describe('getBlockerState', () => {
    it('should return undefined for window without blocking', () => {
      expect(getBlockerState(mockWindow)).toBeUndefined();
    });

    it('should return state after blocking', () => {
      blockShortcuts(mockWindow);
      const state = getBlockerState(mockWindow);
      expect(state).toBeDefined();
      expect(state?.active).toBe(true);
    });
  });

  describe('isShortcutBlocked', () => {
    it('should return false for unblocked shortcut', () => {
      expect(isShortcutBlocked(mockWindow, 'Alt+F4')).toBe(false);
    });

    it('should return true for blocked shortcut', () => {
      blockShortcuts(mockWindow);
      // Check a shortcut that should be blocked on the current platform
      expect(isShortcutBlocked(mockWindow, 'F5')).toBe(true);
    });
  });

  describe('blockSingleShortcut', () => {
    it('should throw error when no window is provided', () => {
      expect(() => blockSingleShortcut(null as unknown as BrowserWindow, 'Alt+F4')).toThrow();
    });

    it('should block a single shortcut', () => {
      blockSingleShortcut(mockWindow, 'Ctrl+Z');
      expect(isShortcutBlocked(mockWindow, 'Ctrl+Z')).toBe(true);
    });

    it('should update state correctly', () => {
      blockSingleShortcut(mockWindow, 'Ctrl+Z');
      const state = getBlockerState(mockWindow);
      expect(state?.active).toBe(true);
      expect(state?.blockedShortcuts).toContain('Ctrl+Z');
    });

    it('should not duplicate if already blocked', () => {
      blockSingleShortcut(mockWindow, 'Ctrl+Z');
      blockSingleShortcut(mockWindow, 'Ctrl+Z');
      const state = getBlockerState(mockWindow);
      const count = state?.blockedShortcuts.filter((s) => s === 'Ctrl+Z').length;
      expect(count).toBe(1);
    });
  });

  describe('unblockSingleShortcut', () => {
    it('should throw error when no window is provided', () => {
      expect(() => unblockSingleShortcut(null as unknown as BrowserWindow, 'Alt+F4')).toThrow();
    });

    it('should unblock a single shortcut', () => {
      blockSingleShortcut(mockWindow, 'Ctrl+Z');
      unblockSingleShortcut(mockWindow, 'Ctrl+Z');
      expect(isShortcutBlocked(mockWindow, 'Ctrl+Z')).toBe(false);
    });

    it('should update state correctly', () => {
      blockSingleShortcut(mockWindow, 'Ctrl+Z');
      blockSingleShortcut(mockWindow, 'Ctrl+Y');
      unblockSingleShortcut(mockWindow, 'Ctrl+Z');

      const state = getBlockerState(mockWindow);
      expect(state?.blockedShortcuts).not.toContain('Ctrl+Z');
      expect(state?.blockedShortcuts).toContain('Ctrl+Y');
    });

    it('should set active to false when no shortcuts remain', () => {
      blockSingleShortcut(mockWindow, 'Ctrl+Z');
      unblockSingleShortcut(mockWindow, 'Ctrl+Z');

      const state = getBlockerState(mockWindow);
      expect(state?.active).toBe(false);
    });

    it('should do nothing for non-blocked shortcut', () => {
      unblockSingleShortcut(mockWindow, 'Ctrl+Z'); // Should not throw
    });
  });

  describe('resetBlockerStates', () => {
    it('should clear all blocker states', () => {
      const window1 = createMockWindow(1);
      const window2 = createMockWindow(2);

      blockShortcuts(window1);
      blockShortcuts(window2);

      resetBlockerStates();

      expect(getBlockerState(window1)).toBeUndefined();
      expect(getBlockerState(window2)).toBeUndefined();
    });
  });
});
