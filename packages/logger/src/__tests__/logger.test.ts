/**
 * Logger unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KioskLogger, createLogger, getLogger } from '../logger';

describe('KioskLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(KioskLogger);
    });

    it('should create a logger with custom options', () => {
      const logger = createLogger({
        level: 'debug',
        source: 'test',
      });
      expect(logger).toBeInstanceOf(KioskLogger);
    });
  });

  describe('log levels', () => {
    it('should log error messages', () => {
      const logger = createLogger({ level: 'error' });
      const fileTransport = logger.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      logger.error('Test error message');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'error', message: 'Test error message' })
      );
    });

    it('should log warn messages when level is warn or below', () => {
      const logger = createLogger({ level: 'warn' });
      const fileTransport = logger.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      logger.warn('Test warn message');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'warn', message: 'Test warn message' })
      );
    });

    it('should log info messages when level is info or below', () => {
      const logger = createLogger({ level: 'info' });
      const fileTransport = logger.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      logger.info('Test info message');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'info', message: 'Test info message' })
      );
    });

    it('should log debug messages when level is debug', () => {
      const logger = createLogger({ level: 'debug' });
      const fileTransport = logger.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      logger.debug('Test debug message');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'debug', message: 'Test debug message' })
      );
    });

    it('should not log debug messages when level is info', () => {
      const logger = createLogger({ level: 'info' });
      const fileTransport = logger.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      logger.debug('Test debug message');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should not log info messages when level is warn', () => {
      const logger = createLogger({ level: 'warn' });
      const fileTransport = logger.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      logger.info('Test info message');
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('log with data', () => {
    it('should log messages with additional data', () => {
      const logger = createLogger({ level: 'info' });
      const fileTransport = logger.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      logger.info('Test message', { key: 'value', num: 123 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'Test message',
          data: { key: 'value', num: 123 },
        })
      );
    });
  });

  describe('child logger', () => {
    it('should create a child logger with prefixed source', () => {
      const logger = createLogger({ source: 'parent' });
      const child = logger.child('child');

      expect(child).toBeInstanceOf(KioskLogger);
    });

    it('should inherit log level from parent', () => {
      const logger = createLogger({ level: 'warn', source: 'parent' });
      const child = logger.child('child') as KioskLogger;
      const fileTransport = child.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      child.info('Should not log');
      expect(logSpy).not.toHaveBeenCalled();

      child.warn('Should log');
      expect(logSpy).toHaveBeenCalled();
    });

    it('should share transports with parent', () => {
      const parent = createLogger({ source: 'app' });
      const child = parent.child('module') as KioskLogger;

      expect(child.getFileTransport()).toBe(parent.getFileTransport());
      expect(child.getRemoteTransport()).toBe(parent.getRemoteTransport());
    });

    it('should prefix source in log entries', () => {
      const parent = createLogger({ source: 'app', level: 'info' });
      const child = parent.child('module') as KioskLogger;
      const fileTransport = child.getFileTransport()!;
      const logSpy = vi.spyOn(fileTransport, 'log');

      child.info('test');

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'app:module' }),
      );
    });

    it('should not close shared transports when child is closed', async () => {
      const parent = createLogger({ source: 'app' });
      const child = parent.child('module') as KioskLogger;
      const fileTransport = parent.getFileTransport()!;
      const closeSpy = vi.spyOn(fileTransport, 'close');

      await child.close();
      expect(closeSpy).not.toHaveBeenCalled();

      await parent.close();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('getLogger singleton', () => {
    it('should initialize singleton with provided options on first call', () => {
      const logger = getLogger({ level: 'debug', source: 'custom' });
      const fileTransport = logger.getFileTransport();
      const logSpy = vi.spyOn(fileTransport!, 'log');

      logger.debug('Test debug message');

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
          message: 'Test debug message',
          source: 'custom',
        })
      );
    });

    it('should return the same instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });

    it('should warn when options are passed to an already-initialised singleton', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      getLogger({ level: 'debug', source: 'first' });

      getLogger({ level: 'error', source: 'second' });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('options ignored'),
      );
    });

    it('should not warn when called without options after initialisation', () => {
      // Singleton is already initialised by previous tests
      const warnSpy = vi.spyOn(console, 'warn');

      getLogger();

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('options ignored'),
      );
    });
  });

  describe('flush and close', () => {
    it('should flush without errors', async () => {
      const logger = createLogger();
      await expect(logger.flush()).resolves.toBeUndefined();
    });

    it('should close without errors', async () => {
      const logger = createLogger();
      await expect(logger.close()).resolves.toBeUndefined();
    });
  });
});
