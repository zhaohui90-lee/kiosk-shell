/**
 * Type definitions tests
 * Verifies type exports and basic type checking
 */

import { describe, it, expect } from 'vitest';
import type {
  WindowConfig,
  LoaderConfig,
  SlotId,
  SlotInfo,
  ProtocolResponse,
  LifecycleEvent,
  AppState,
} from '../types';

describe('Type Definitions', () => {
  describe('WindowConfig', () => {
    it('should accept valid configuration', () => {
      const config: WindowConfig = {
        width: 1920,
        height: 1080,
        fullscreen: true,
        kiosk: true,
        frame: false,
        resizable: false,
        devTools: false,
      };

      expect(config.width).toBe(1920);
      expect(config.fullscreen).toBe(true);
    });

    it('should accept minimal configuration', () => {
      const config: WindowConfig = {};
      expect(config).toBeDefined();
    });
  });

  describe('LoaderConfig', () => {
    it('should require basePath', () => {
      const config: LoaderConfig = {
        basePath: '/path/to/resources',
      };

      expect(config.basePath).toBe('/path/to/resources');
    });

    it('should accept optional fields', () => {
      const config: LoaderConfig = {
        basePath: '/path/to/resources',
        useKioskProtocol: true,
        entryFile: 'index.html',
        enableSlotSwitching: true,
      };

      expect(config.useKioskProtocol).toBe(true);
      expect(config.enableSlotSwitching).toBe(true);
    });
  });

  describe('SlotId', () => {
    it('should only allow slot-a or slot-b', () => {
      const slotA: SlotId = 'slot-a';
      const slotB: SlotId = 'slot-b';

      expect(slotA).toBe('slot-a');
      expect(slotB).toBe('slot-b');
    });
  });

  describe('SlotInfo', () => {
    it('should contain slot information', () => {
      const info: SlotInfo = {
        id: 'slot-a',
        path: '/path/to/slot-a',
        version: '1.0.0',
        lastModified: new Date(),
        isActive: true,
      };

      expect(info.id).toBe('slot-a');
      expect(info.isActive).toBe(true);
    });

    it('should allow undefined version and lastModified', () => {
      const info: SlotInfo = {
        id: 'slot-b',
        path: '/path/to/slot-b',
        version: undefined,
        lastModified: undefined,
        isActive: false,
      };

      expect(info.version).toBeUndefined();
      expect(info.lastModified).toBeUndefined();
    });
  });

  describe('ProtocolResponse', () => {
    it('should contain response data', () => {
      const response: ProtocolResponse = {
        mimeType: 'text/html',
        data: Buffer.from('<html></html>'),
        statusCode: 200,
      };

      expect(response.mimeType).toBe('text/html');
      expect(response.statusCode).toBe(200);
    });
  });

  describe('LifecycleEvent', () => {
    it('should accept valid lifecycle events', () => {
      const events: LifecycleEvent[] = [
        'ready',
        'window-all-closed',
        'before-quit',
        'will-quit',
        'quit',
        'activate',
        'second-instance',
      ];

      expect(events).toHaveLength(7);
    });
  });

  describe('AppState', () => {
    it('should contain application state', () => {
      const state: AppState = {
        isReady: true,
        isQuitting: false,
        mainWindow: null,
        activeSlot: 'slot-a',
      };

      expect(state.isReady).toBe(true);
      expect(state.isQuitting).toBe(false);
      expect(state.activeSlot).toBe('slot-a');
    });
  });
});
