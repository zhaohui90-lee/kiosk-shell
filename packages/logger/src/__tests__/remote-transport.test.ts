/**
 * Remote transport unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RemoteTransport, createRemoteTransport } from '../remote-transport';
import type { LogEntry } from '../types';

describe('RemoteTransport', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createLogEntry = (level: LogEntry['level'] = 'error'): LogEntry => ({
    level,
    message: 'Test message',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    source: 'test',
  });

  describe('createRemoteTransport', () => {
    it('should create a remote transport instance', () => {
      const transport = createRemoteTransport();
      expect(transport).toBeInstanceOf(RemoteTransport);
    });
  });

  describe('log', () => {
    it('should not log when disabled', () => {
      const transport = createRemoteTransport({ enabled: false });
      transport.log(createLogEntry());
      expect(transport.getBufferSize()).toBe(0);
    });

    it('should not log when no server URL', () => {
      const transport = createRemoteTransport({ enabled: true, serverUrl: '' });
      transport.log(createLogEntry());
      expect(transport.getBufferSize()).toBe(0);
    });

    it('should buffer logs when enabled', () => {
      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        flushInterval: 0, // Disable timer for testing
      });

      transport.log(createLogEntry());
      expect(transport.getBufferSize()).toBe(1);
    });

    it('should respect minLevel setting', () => {
      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        minLevel: 'warn',
        flushInterval: 0,
      });

      transport.log(createLogEntry('info'));
      expect(transport.getBufferSize()).toBe(0);

      transport.log(createLogEntry('warn'));
      expect(transport.getBufferSize()).toBe(1);

      transport.log(createLogEntry('error'));
      expect(transport.getBufferSize()).toBe(2);
    });
  });

  describe('flush', () => {
    it('should send logs to server', async () => {
      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        deviceId: 'test-device',
        flushInterval: 0,
      });

      transport.log(createLogEntry());
      await transport.flush();

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://example.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(transport.getBufferSize()).toBe(0);
    });

    it('should not flush when buffer is empty', async () => {
      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        flushInterval: 0,
      });

      await transport.flush();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('Error', { status: 500 })
      );

      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        flushInterval: 0,
      });

      transport.log(createLogEntry());
      await transport.flush();

      // Log should be back in buffer for retry
      expect(transport.getBufferSize()).toBe(1);
    });
  });

  describe('configure', () => {
    it('should update options', () => {
      const transport = createRemoteTransport({ enabled: false });

      transport.configure({ enabled: true, serverUrl: 'https://example.com/logs' });
      transport.log(createLogEntry());

      expect(transport.getBufferSize()).toBe(1);
    });
  });

  describe('close', () => {
    it('should flush remaining logs on close', async () => {
      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        flushInterval: 0,
      });

      transport.log(createLogEntry());
      await transport.close();

      expect(fetchSpy).toHaveBeenCalled();
      expect(transport.getBufferSize()).toBe(0);
    });
  });

  describe('batch size', () => {
    it('should auto-flush when batch size is reached', async () => {
      const transport = createRemoteTransport({
        enabled: true,
        serverUrl: 'https://example.com/logs',
        batchSize: 2,
        flushInterval: 0,
      });

      transport.log(createLogEntry());
      expect(fetchSpy).not.toHaveBeenCalled();

      transport.log(createLogEntry());
      // Wait for async flush
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
