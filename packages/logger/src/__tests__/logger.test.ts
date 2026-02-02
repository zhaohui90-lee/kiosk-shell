/**
 * Logger unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KioskLogger, createLogger, getLogger, initLogger } from '../logger';
import type { LogLevel } from '../types';

describe('KioskLogger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
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
  });

  describe('getLogger singleton', () => {
    it('should return the same instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });
  });

  describe('initLogger', () => {
    it('should initialize logger with custom options', () => {
      const logger = initLogger({ level: 'debug', source: 'custom' });
      expect(logger).toBeInstanceOf(KioskLogger);
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
