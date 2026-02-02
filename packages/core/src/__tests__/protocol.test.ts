/**
 * Protocol handler tests
 * Tests MIME type resolution and path handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron modules before importing
vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn(),
  },
  net: {},
}));

vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  }),
}));

import { ProtocolHandler, KIOSK_PROTOCOL } from '../protocol';

describe('ProtocolHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('KIOSK_PROTOCOL constant', () => {
    it('should be "kiosk"', () => {
      expect(KIOSK_PROTOCOL).toBe('kiosk');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for HTML files', () => {
      expect(ProtocolHandler.getMimeType('index.html')).toBe('text/html');
      expect(ProtocolHandler.getMimeType('page.htm')).toBe('text/html');
    });

    it('should return correct MIME type for CSS files', () => {
      expect(ProtocolHandler.getMimeType('styles.css')).toBe('text/css');
    });

    it('should return correct MIME type for JavaScript files', () => {
      expect(ProtocolHandler.getMimeType('app.js')).toBe('application/javascript');
      expect(ProtocolHandler.getMimeType('module.mjs')).toBe('application/javascript');
    });

    it('should return correct MIME type for JSON files', () => {
      expect(ProtocolHandler.getMimeType('data.json')).toBe('application/json');
    });

    it('should return correct MIME type for image files', () => {
      expect(ProtocolHandler.getMimeType('image.png')).toBe('image/png');
      expect(ProtocolHandler.getMimeType('photo.jpg')).toBe('image/jpeg');
      expect(ProtocolHandler.getMimeType('photo.jpeg')).toBe('image/jpeg');
      expect(ProtocolHandler.getMimeType('icon.gif')).toBe('image/gif');
      expect(ProtocolHandler.getMimeType('logo.svg')).toBe('image/svg+xml');
      expect(ProtocolHandler.getMimeType('favicon.ico')).toBe('image/x-icon');
      expect(ProtocolHandler.getMimeType('image.webp')).toBe('image/webp');
    });

    it('should return correct MIME type for font files', () => {
      expect(ProtocolHandler.getMimeType('font.woff')).toBe('font/woff');
      expect(ProtocolHandler.getMimeType('font.woff2')).toBe('font/woff2');
      expect(ProtocolHandler.getMimeType('font.ttf')).toBe('font/ttf');
      expect(ProtocolHandler.getMimeType('font.otf')).toBe('font/otf');
    });

    it('should return correct MIME type for media files', () => {
      expect(ProtocolHandler.getMimeType('audio.mp3')).toBe('audio/mpeg');
      expect(ProtocolHandler.getMimeType('audio.wav')).toBe('audio/wav');
      expect(ProtocolHandler.getMimeType('video.mp4')).toBe('video/mp4');
      expect(ProtocolHandler.getMimeType('video.webm')).toBe('video/webm');
    });

    it('should return default MIME type for unknown extensions', () => {
      expect(ProtocolHandler.getMimeType('file.xyz')).toBe('application/octet-stream');
      expect(ProtocolHandler.getMimeType('noextension')).toBe('application/octet-stream');
    });

    it('should handle uppercase extensions', () => {
      expect(ProtocolHandler.getMimeType('FILE.HTML')).toBe('text/html');
      expect(ProtocolHandler.getMimeType('IMAGE.PNG')).toBe('image/png');
    });
  });

  describe('ProtocolHandler instance', () => {
    it('should create instance with basePath', () => {
      const handler = new ProtocolHandler('/test/path');
      expect(handler.getBasePath()).toBe('/test/path');
    });

    it('should update basePath', () => {
      const handler = new ProtocolHandler('/original/path');
      handler.setBasePath('/new/path');
      expect(handler.getBasePath()).toBe('/new/path');
    });

    it('should initially not be registered', () => {
      const handler = new ProtocolHandler('/test/path');
      expect(handler.isProtocolRegistered()).toBe(false);
    });
  });
});
