/**
 * Heartbeat unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initHeartbeat,
  startHeartbeat,
  stopHeartbeat,
  receiveHeartbeat,
  createHeartbeatPing,
  createHeartbeatPong,
  isHeartbeatPing,
  isHeartbeatPong,
  isHeartbeatActive,
  isResponsive,
  getHeartbeatState,
  getTimeSinceLastHeartbeat,
  getHeartbeatConfig,
  onHeartbeat,
  onHeartbeatEvent,
  offHeartbeatEvent,
  resetHeartbeat,
  createIpcHeartbeatHandler,
  triggerHeartbeatCheck,
} from '../heartbeat';
import { IPC_MESSAGE_TYPES, ERROR_MESSAGES } from '../constants';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Heartbeat', () => {
  beforeEach(() => {
    resetHeartbeat();
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetHeartbeat();
    vi.useRealTimers();
  });

  describe('initHeartbeat', () => {
    it('should initialize with default config', () => {
      initHeartbeat();
      const config = getHeartbeatConfig();
      expect(config.interval).toBe(3000);
      expect(config.timeout).toBe(10000);
      expect(config.missedThreshold).toBe(3);
    });

    it('should accept custom configuration', () => {
      initHeartbeat({
        interval: 5000,
        timeout: 15000,
        missedThreshold: 5,
      });

      const config = getHeartbeatConfig();
      expect(config.interval).toBe(5000);
      expect(config.timeout).toBe(15000);
      expect(config.missedThreshold).toBe(5);
    });
  });

  describe('startHeartbeat', () => {
    it('should start heartbeat monitoring', () => {
      initHeartbeat();
      startHeartbeat();

      expect(isHeartbeatActive()).toBe(true);
    });

    it('should reset state on start', () => {
      initHeartbeat();
      startHeartbeat();

      const state = getHeartbeatState();
      expect(state.lastHeartbeat).toBe(null);
      expect(state.missedCount).toBe(0);
      expect(state.responsive).toBe(true);
    });

    it('should not start twice', () => {
      initHeartbeat();
      startHeartbeat();
      startHeartbeat(); // Should be ignored

      expect(isHeartbeatActive()).toBe(true);
    });
  });

  describe('stopHeartbeat', () => {
    it('should stop heartbeat monitoring', () => {
      initHeartbeat();
      startHeartbeat();
      stopHeartbeat();

      expect(isHeartbeatActive()).toBe(false);
    });

    it('should be safe to call when not active', () => {
      expect(() => stopHeartbeat()).not.toThrow();
    });
  });

  describe('receiveHeartbeat', () => {
    it('should update last heartbeat time', () => {
      initHeartbeat();
      startHeartbeat();

      const now = new Date();
      vi.setSystemTime(now);
      receiveHeartbeat();

      const state = getHeartbeatState();
      expect(state.lastHeartbeat).toEqual(now);
    });

    it('should reset missed count', () => {
      initHeartbeat({ interval: 1000, timeout: 500 });
      startHeartbeat();

      // Advance time to trigger missed heartbeat
      vi.advanceTimersByTime(1000);

      let state = getHeartbeatState();
      expect(state.missedCount).toBeGreaterThan(0);

      // Receive heartbeat
      receiveHeartbeat();

      state = getHeartbeatState();
      expect(state.missedCount).toBe(0);
    });

    it('should set responsive to true', () => {
      initHeartbeat();
      startHeartbeat();
      receiveHeartbeat();

      expect(isResponsive()).toBe(true);
    });

    it('should emit heartbeat-received event', () => {
      initHeartbeat();
      const handler = vi.fn();
      onHeartbeatEvent(handler);
      startHeartbeat();

      receiveHeartbeat();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat-received',
        })
      );
    });

    it('should call heartbeat callback', () => {
      initHeartbeat();
      startHeartbeat();

      const callback = vi.fn();
      onHeartbeat(callback);

      receiveHeartbeat();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('IPC message helpers', () => {
    it('should create heartbeat ping', () => {
      expect(createHeartbeatPing()).toBe(IPC_MESSAGE_TYPES.HEARTBEAT_PING);
    });

    it('should create heartbeat pong', () => {
      expect(createHeartbeatPong()).toBe(IPC_MESSAGE_TYPES.HEARTBEAT_PONG);
    });

    it('should identify heartbeat ping', () => {
      expect(isHeartbeatPing(IPC_MESSAGE_TYPES.HEARTBEAT_PING)).toBe(true);
      expect(isHeartbeatPing(IPC_MESSAGE_TYPES.HEARTBEAT_PONG)).toBe(false);
      expect(isHeartbeatPing('other')).toBe(false);
    });

    it('should identify heartbeat pong', () => {
      expect(isHeartbeatPong(IPC_MESSAGE_TYPES.HEARTBEAT_PONG)).toBe(true);
      expect(isHeartbeatPong(IPC_MESSAGE_TYPES.HEARTBEAT_PING)).toBe(false);
      expect(isHeartbeatPong('other')).toBe(false);
    });
  });

  describe('getHeartbeatState', () => {
    it('should return initial state', () => {
      const state = getHeartbeatState();

      expect(state.active).toBe(false);
      expect(state.lastHeartbeat).toBe(null);
      expect(state.missedCount).toBe(0);
      expect(state.responsive).toBe(true);
    });

    it('should return a copy of state (immutable)', () => {
      const state1 = getHeartbeatState();
      const state2 = getHeartbeatState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getTimeSinceLastHeartbeat', () => {
    it('should return null if no heartbeat received', () => {
      expect(getTimeSinceLastHeartbeat()).toBe(null);
    });

    it('should return time since last heartbeat', () => {
      initHeartbeat();
      startHeartbeat();

      const startTime = new Date();
      vi.setSystemTime(startTime);
      receiveHeartbeat();

      vi.setSystemTime(new Date(startTime.getTime() + 5000));

      expect(getTimeSinceLastHeartbeat()).toBe(5000);
    });
  });

  describe('isResponsive', () => {
    it('should return true initially', () => {
      expect(isResponsive()).toBe(true);
    });

    it('should return false after too many missed heartbeats', () => {
      initHeartbeat({
        interval: 1000,
        timeout: 500,
        missedThreshold: 2,
      });
      startHeartbeat();

      // Advance time to trigger missed heartbeats
      vi.advanceTimersByTime(1000); // First miss
      vi.advanceTimersByTime(1000); // Second miss - threshold reached

      expect(isResponsive()).toBe(false);
    });
  });

  describe('event handlers', () => {
    it('should emit heartbeat-missed event', () => {
      initHeartbeat({
        interval: 1000,
        timeout: 500,
      });

      const handler = vi.fn();
      onHeartbeatEvent(handler);
      startHeartbeat();

      vi.advanceTimersByTime(1000);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat-missed',
        })
      );
    });

    it('should emit process-unresponsive event', () => {
      initHeartbeat({
        interval: 1000,
        timeout: 500,
        missedThreshold: 2,
      });

      const handler = vi.fn();
      onHeartbeatEvent(handler);
      startHeartbeat();

      // Trigger enough missed heartbeats
      vi.advanceTimersByTime(2000);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'process-unresponsive',
        })
      );
    });

    it('should remove event handler', () => {
      initHeartbeat({ interval: 1000, timeout: 500 });

      const handler = vi.fn();
      const unsubscribe = onHeartbeatEvent(handler);
      unsubscribe();

      startHeartbeat();
      vi.advanceTimersByTime(1000);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support offHeartbeatEvent', () => {
      initHeartbeat({ interval: 1000, timeout: 500 });

      const handler = vi.fn();
      onHeartbeatEvent(handler);
      offHeartbeatEvent(handler);

      startHeartbeat();
      vi.advanceTimersByTime(1000);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onHeartbeat', () => {
    it('should register heartbeat callback', () => {
      initHeartbeat();
      startHeartbeat();

      const callback = vi.fn();
      onHeartbeat(callback);

      receiveHeartbeat();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      initHeartbeat();
      startHeartbeat();

      const callback = vi.fn();
      const unsubscribe = onHeartbeat(callback);
      unsubscribe();

      receiveHeartbeat();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('createIpcHeartbeatHandler', () => {
    it('should return handler object', () => {
      const handler = createIpcHeartbeatHandler();

      expect(typeof handler.handlePing).toBe('function');
      expect(typeof handler.handlePong).toBe('function');
    });

    it('should return pong on handlePing', () => {
      const handler = createIpcHeartbeatHandler();
      expect(handler.handlePing()).toBe(IPC_MESSAGE_TYPES.HEARTBEAT_PONG);
    });

    it('should receive heartbeat on handlePong', () => {
      initHeartbeat();
      startHeartbeat();

      const handler = createIpcHeartbeatHandler();
      const now = new Date();
      vi.setSystemTime(now);
      handler.handlePong();

      const state = getHeartbeatState();
      expect(state.lastHeartbeat).toEqual(now);
    });
  });

  describe('triggerHeartbeatCheck', () => {
    it('should throw error if not active', () => {
      expect(() => triggerHeartbeatCheck()).toThrow(ERROR_MESSAGES.HEARTBEAT_NOT_ACTIVE);
    });

    it('should trigger heartbeat check', () => {
      initHeartbeat({ interval: 1000, timeout: 500 });
      startHeartbeat();

      const handler = vi.fn();
      onHeartbeatEvent(handler);

      triggerHeartbeatCheck();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat-missed',
        })
      );
    });
  });

  describe('resetHeartbeat', () => {
    it('should reset all state', () => {
      initHeartbeat({ interval: 5000 });
      startHeartbeat();
      receiveHeartbeat();

      resetHeartbeat();

      const state = getHeartbeatState();
      expect(state.active).toBe(false);
      expect(state.lastHeartbeat).toBe(null);
      expect(state.missedCount).toBe(0);
      expect(state.responsive).toBe(true);
    });

    it('should stop heartbeat if active', () => {
      initHeartbeat();
      startHeartbeat();

      expect(isHeartbeatActive()).toBe(true);

      resetHeartbeat();

      expect(isHeartbeatActive()).toBe(false);
    });

    it('should clear event handlers', () => {
      const handler = vi.fn();
      onHeartbeatEvent(handler);

      resetHeartbeat();

      initHeartbeat({ interval: 1000, timeout: 500 });
      startHeartbeat();
      vi.advanceTimersByTime(1000);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should reset config to defaults', () => {
      initHeartbeat({
        interval: 10000,
        timeout: 30000,
        missedThreshold: 10,
      });

      resetHeartbeat();

      const config = getHeartbeatConfig();
      expect(config.interval).toBe(3000); // Default value
    });
  });
});
