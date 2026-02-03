/**
 * Tests for blank screen detector
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { BrowserWindow, WebContents } from 'electron';
import {
  startBlankDetection,
  stopBlankDetection,
  getBlankDetectorState,
  checkBlankNow,
  updateBlankDetectorConfig,
  resetBlankCount,
  getLastBlankResult,
  resetBlankDetectorStates,
} from '../blank-detector';
import type { BlankDetectorConfig, BlankDetectionResult } from '../types';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock BrowserWindow
function createMockWindow(
  id: number,
  executeResult: { isBlank: boolean; reason?: string; height?: number } = { isBlank: false, height: 500 }
): BrowserWindow {
  const mockWebContents = {
    executeJavaScript: vi.fn().mockResolvedValue(executeResult),
    getURL: vi.fn().mockReturnValue('https://example.com'),
  } as unknown as WebContents;

  return {
    id,
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: mockWebContents,
    on: vi.fn(),
  } as unknown as BrowserWindow;
}

describe('Blank Screen Detector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetBlankDetectorStates();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startBlankDetection', () => {
    it('should throw error when window is not provided', () => {
      expect(() => startBlankDetection(null as unknown as BrowserWindow)).toThrow(
        'No window provided'
      );
    });

    it('should start detection and return state', () => {
      const window = createMockWindow(1);
      const state = startBlankDetection(window);

      expect(state).toBeDefined();
      expect(state.windowId).toBe(1);
      expect(state.active).toBe(true);
      expect(state.consecutiveBlankCount).toBe(0);
    });

    it('should return existing state if already detecting', () => {
      const window = createMockWindow(1);
      const state1 = startBlankDetection(window);
      const state2 = startBlankDetection(window);

      expect(state1).toBe(state2);
    });

    it('should register closed event handler', () => {
      const window = createMockWindow(1);
      startBlankDetection(window);

      expect(window.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    it('should use provided config', () => {
      const window = createMockWindow(1);
      const config: BlankDetectorConfig = {
        checkIntervalMs: 10000,
        blankThreshold: 5,
      };

      const state = startBlankDetection(window, config);

      expect(state.config.checkIntervalMs).toBe(10000);
      expect(state.config.blankThreshold).toBe(5);
    });

    it('should start interval timer', () => {
      const window = createMockWindow(1);
      const state = startBlankDetection(window);

      expect(state.timerId).toBeDefined();
    });
  });

  describe('stopBlankDetection', () => {
    it('should throw error when window is not provided', () => {
      expect(() => stopBlankDetection(null as unknown as BrowserWindow)).toThrow(
        'No window provided'
      );
    });

    it('should mark detection as inactive', () => {
      const window = createMockWindow(1);
      startBlankDetection(window);
      stopBlankDetection(window);

      const state = getBlankDetectorState(window);
      expect(state!.active).toBe(false);
    });

    it('should clear interval timer', () => {
      const window = createMockWindow(1);
      startBlankDetection(window);
      stopBlankDetection(window);

      const state = getBlankDetectorState(window);
      expect(state!.timerId).toBeUndefined();
    });

    it('should do nothing if not detecting', () => {
      const window = createMockWindow(1);
      // Should not throw
      expect(() => stopBlankDetection(window)).not.toThrow();
    });
  });

  describe('getBlankDetectorState', () => {
    it('should return undefined when not detecting', () => {
      const window = createMockWindow(1);
      expect(getBlankDetectorState(window)).toBeUndefined();
    });

    it('should return state when detecting', () => {
      const window = createMockWindow(1);
      startBlankDetection(window);

      const state = getBlankDetectorState(window);
      expect(state).toBeDefined();
      expect(state!.windowId).toBe(1);
    });
  });

  describe('checkBlankNow', () => {
    it('should throw error when window is not provided', async () => {
      await expect(checkBlankNow(null as unknown as BrowserWindow)).rejects.toThrow(
        'No window provided'
      );
    });

    it('should return blank result for destroyed window', async () => {
      const window = createMockWindow(1);
      (window.isDestroyed as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = await checkBlankNow(window);

      expect(result.isBlank).toBe(true);
      expect(result.reason).toBe('error');
    });

    it('should return non-blank result for page with content', async () => {
      const window = createMockWindow(1, { isBlank: false, height: 500 });

      const result = await checkBlankNow(window);

      expect(result.isBlank).toBe(false);
    });

    it('should return blank result for empty page', async () => {
      const window = createMockWindow(1, { isBlank: true, reason: 'empty-body', height: 0 });

      const result = await checkBlankNow(window);

      expect(result.isBlank).toBe(true);
      expect(result.reason).toBe('empty-body');
    });

    it('should return blank result for page below height threshold', async () => {
      const window = createMockWindow(1, { isBlank: true, reason: 'no-content', height: 50 });

      const result = await checkBlankNow(window);

      expect(result.isBlank).toBe(true);
      expect(result.reason).toBe('no-content');
    });

    it('should handle JavaScript execution errors', async () => {
      const window = createMockWindow(1);
      (window.webContents.executeJavaScript as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Script error')
      );

      const result = await checkBlankNow(window);

      expect(result.isBlank).toBe(true);
      expect(result.reason).toBe('error');
      expect(result.details).toBe('Script error');
    });
  });

  describe('updateBlankDetectorConfig', () => {
    it('should update configuration', () => {
      const window = createMockWindow(1);
      startBlankDetection(window);

      updateBlankDetectorConfig(window, { blankThreshold: 10 });

      const state = getBlankDetectorState(window);
      expect(state!.config.blankThreshold).toBe(10);
    });

    it('should merge with existing config', () => {
      const window = createMockWindow(1);
      startBlankDetection(window, { minContentHeight: 200 });

      updateBlankDetectorConfig(window, { blankThreshold: 10 });

      const state = getBlankDetectorState(window);
      expect(state!.config.blankThreshold).toBe(10);
      expect(state!.config.minContentHeight).toBe(200);
    });

    it('should restart timer if interval changed', () => {
      const window = createMockWindow(1);
      startBlankDetection(window, { checkIntervalMs: 5000 });

      const originalTimerId = getBlankDetectorState(window)!.timerId;

      updateBlankDetectorConfig(window, { checkIntervalMs: 10000 });

      const newTimerId = getBlankDetectorState(window)!.timerId;
      expect(newTimerId).not.toBe(originalTimerId);
    });
  });

  describe('resetBlankCount', () => {
    it('should reset consecutive blank count to 0', async () => {
      const window = createMockWindow(1, { isBlank: true, reason: 'empty-body' });
      startBlankDetection(window, { checkIntervalMs: 100, blankThreshold: 10 });

      // Trigger a few checks - need to wait for at least one interval
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      const stateBeforeReset = getBlankDetectorState(window);
      // Blank count should be 3 after 3 intervals
      expect(stateBeforeReset!.consecutiveBlankCount).toBe(3);

      resetBlankCount(window);

      const stateAfterReset = getBlankDetectorState(window);
      expect(stateAfterReset!.consecutiveBlankCount).toBe(0);
    });
  });

  describe('getLastBlankResult', () => {
    it('should return undefined when no checks performed', () => {
      const window = createMockWindow(1);
      expect(getLastBlankResult(window)).toBeUndefined();
    });

    it('should return last result after check', async () => {
      const window = createMockWindow(1, { isBlank: false, height: 500 });
      startBlankDetection(window, { checkIntervalMs: 100 });

      await vi.advanceTimersByTimeAsync(100);

      const result = getLastBlankResult(window);
      expect(result).toBeDefined();
      expect(result!.isBlank).toBe(false);
    });
  });

  describe('blank detection interval', () => {
    it('should increment consecutive blank count on blank detection', async () => {
      const window = createMockWindow(1, { isBlank: true, reason: 'empty-body' });
      startBlankDetection(window, { checkIntervalMs: 100, blankThreshold: 5 });

      await vi.advanceTimersByTimeAsync(300);

      const state = getBlankDetectorState(window);
      expect(state!.consecutiveBlankCount).toBe(3);
    });

    it('should reset consecutive blank count on non-blank detection', async () => {
      const window = createMockWindow(1, { isBlank: true, reason: 'empty-body' });
      startBlankDetection(window, { checkIntervalMs: 100, blankThreshold: 5 });

      // First few checks return blank
      await vi.advanceTimersByTimeAsync(200);

      // Now return non-blank
      (window.webContents.executeJavaScript as ReturnType<typeof vi.fn>).mockResolvedValue({
        isBlank: false,
        height: 500,
      });

      await vi.advanceTimersByTimeAsync(100);

      const state = getBlankDetectorState(window);
      expect(state!.consecutiveBlankCount).toBe(0);
    });

    it('should call onBlankDetected when threshold reached', async () => {
      const window = createMockWindow(1, { isBlank: true, reason: 'empty-body' });
      const onBlankDetected = vi.fn();

      startBlankDetection(window, {
        checkIntervalMs: 100,
        blankThreshold: 3,
        onBlankDetected,
      });

      await vi.advanceTimersByTimeAsync(300);

      expect(onBlankDetected).toHaveBeenCalled();
    });

    it('should reset count after callback', async () => {
      const window = createMockWindow(1, { isBlank: true, reason: 'empty-body' });
      const onBlankDetected = vi.fn();

      startBlankDetection(window, {
        checkIntervalMs: 100,
        blankThreshold: 3,
        onBlankDetected,
      });

      await vi.advanceTimersByTimeAsync(300);

      const state = getBlankDetectorState(window);
      expect(state!.consecutiveBlankCount).toBe(0);
    });
  });

  describe('window destruction handling', () => {
    it('should detect blank when window is destroyed', async () => {
      const window = createMockWindow(1);
      startBlankDetection(window, { checkIntervalMs: 100 });

      // Destroy window after start
      (window.isDestroyed as ReturnType<typeof vi.fn>).mockReturnValue(true);

      await vi.advanceTimersByTimeAsync(100);

      const result = getLastBlankResult(window);
      expect(result!.isBlank).toBe(true);
      expect(result!.reason).toBe('error');
    });
  });

  describe('window without webContents', () => {
    it('should detect blank when webContents is missing', async () => {
      const window = createMockWindow(1);
      (window as unknown as { webContents: null }).webContents = null;

      const result = await checkBlankNow(window);

      expect(result.isBlank).toBe(true);
      expect(result.reason).toBe('error');
    });
  });
});
