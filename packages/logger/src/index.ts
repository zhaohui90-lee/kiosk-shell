/**
 * @kiosk/logger
 * Logging module with file rotation and remote transport
 */

// Export types
export type {
  LogLevel,
  LogEntry,
  FileTransportOptions,
  RemoteTransportOptions,
  LoggerOptions,
  Logger,
  Transport,
} from './types';

// Export file transport
export { FileTransport, createFileTransport } from './file-transport';

// Export remote transport
export { RemoteTransport, createRemoteTransport } from './remote-transport';

// Export logger
export {
  KioskLogger,
  createLogger,
  getLogger,
  initLogger,
} from './logger';

// Default export: the default logger instance getter
import { getLogger } from './logger';
export default getLogger;
