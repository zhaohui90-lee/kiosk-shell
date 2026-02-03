/**
 * Custom protocol module
 * Registers kiosk:// protocol for loading local resources
 */

import * as fs from 'fs';
import * as path from 'path';
import { protocol } from 'electron';
import { getLogger } from '@kiosk/logger';
import type { ProtocolResponse } from './types';

const logger = getLogger().child('core:protocol');

/**
 * Protocol scheme name
 */
export const KIOSK_PROTOCOL = 'kiosk';

/**
 * MIME type mapping for common file extensions
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

/**
 * Default MIME type for unknown extensions
 */
const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * ProtocolHandler class
 * Manages the kiosk:// custom protocol
 */
export class ProtocolHandler {
  private basePath: string;
  private isRegistered = false;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Register the kiosk:// protocol as privileged
   * Must be called before app.ready
   */
  static registerPrivileged(): void {
    logger.info('Registering kiosk:// as privileged protocol');

    protocol.registerSchemesAsPrivileged([
      {
        scheme: KIOSK_PROTOCOL,
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          corsEnabled: true,
          stream: true,
        },
      },
    ]);
  }

  /**
   * Register the protocol handler
   * Must be called after app.ready
   */
  register(): void {
    if (this.isRegistered) {
      logger.warn('Protocol already registered');
      return;
    }

    logger.info('Registering kiosk:// protocol handler', { basePath: this.basePath });

    // Use handle for modern Electron API
    protocol.handle(KIOSK_PROTOCOL, (request) => this.handleRequest(request));

    this.isRegistered = true;
    logger.info('Protocol handler registered successfully');
  }

  /**
   * Unregister the protocol handler
   */
  unregister(): void {
    if (!this.isRegistered) {
      return;
    }

    logger.info('Unregistering kiosk:// protocol handler');

    // Note: Electron doesn't provide a direct way to unregister protocol.handle
    // This flag is mainly for internal state tracking
    this.isRegistered = false;
  }

  /**
   * Handle incoming protocol requests
   * Note: Using type assertion due to undici-types/Electron Response type mismatch
   */
  private handleRequest(request: Request): Response {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(url.pathname);

    logger.debug('Handling protocol request', {
      url: request.url,
      pathname: relativePath,
    });

    try {
      const response = this.resolveFile(relativePath);
      return new Response(response.data, {
        status: response.statusCode ?? 200,
        headers: {
          'Content-Type': response.mimeType,
          'Content-Length': String(response.data.length),
        },
      }) as Response;
    } catch (error) {
      const err = error as Error;
      logger.error('Protocol request failed', {
        url: request.url,
        error: err.message,
      });

      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      }) as Response;
    }
  }

  /**
   * Resolve a file path and return its contents
   */
  private resolveFile(relativePath: string): ProtocolResponse {
    // Remove leading slash
    let cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

    // Default to index.html for root path
    if (cleanPath === '' || cleanPath === 'app' || cleanPath === 'app/') {
      cleanPath = 'index.html';
    }

    // Remove 'app/' prefix if present
    if (cleanPath.startsWith('app/')) {
      cleanPath = cleanPath.slice(4);
    }

    const filePath = path.join(this.basePath, cleanPath);

    // Security check: ensure resolved path is within base path
    const resolvedPath = path.resolve(filePath);
    const resolvedBasePath = path.resolve(this.basePath);

    if (!resolvedPath.startsWith(resolvedBasePath)) {
      logger.error('Path traversal attempt blocked', {
        requestedPath: relativePath,
        resolvedPath,
        basePath: resolvedBasePath,
      });
      throw new Error('Access denied: path traversal attempt');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Try with .html extension for clean URLs
      const htmlPath = filePath + '.html';
      if (fs.existsSync(htmlPath)) {
        return this.readFileWithMime(htmlPath);
      }

      // Try index.html in directory
      const indexPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return this.readFileWithMime(indexPath);
      }

      throw new Error(`File not found: ${cleanPath}`);
    }

    // If path is a directory, serve index.html
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return this.readFileWithMime(indexPath);
      }
      throw new Error(`Directory index not found: ${cleanPath}`);
    }

    return this.readFileWithMime(filePath);
  }

  /**
   * Read file and determine MIME type
   */
  private readFileWithMime(filePath: string): ProtocolResponse {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] ?? DEFAULT_MIME_TYPE;
    const data = fs.readFileSync(filePath);

    return {
      mimeType,
      data,
      statusCode: 200,
    };
  }

  /**
   * Update the base path
   */
  setBasePath(basePath: string): void {
    logger.info('Updating protocol base path', { from: this.basePath, to: basePath });
    this.basePath = basePath;
  }

  /**
   * Get the current base path
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Check if protocol is registered
   */
  isProtocolRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * Get MIME type for a file extension
   */
  static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] ?? DEFAULT_MIME_TYPE;
  }
}

// Singleton instance
let protocolHandler: ProtocolHandler | null = null;

/**
 * Get the ProtocolHandler singleton
 */
export function getProtocolHandler(basePath?: string): ProtocolHandler {
  if (!protocolHandler) {
    if (!basePath) {
      throw new Error('Base path required for initial ProtocolHandler creation');
    }
    protocolHandler = new ProtocolHandler(basePath);
  }
  return protocolHandler;
}

/**
 * Reset the ProtocolHandler (useful for testing)
 */
export function resetProtocolHandler(): void {
  if (protocolHandler) {
    protocolHandler.unregister();
    protocolHandler = null;
  }
}

/**
 * Create a new ProtocolHandler instance
 */
export function createProtocolHandler(basePath: string): ProtocolHandler {
  return new ProtocolHandler(basePath);
}
