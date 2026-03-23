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
} from './types'

export { LEVEL_PRIORITY } from './types'
export { UploadQueue } from './upload-queue'

// Export file transport
export { FileTransport, createFileTransport } from './file-transport'

// Export remote transport
export { RemoteTransport, createRemoteTransport } from './remote-transport'

// Export logger
export { KioskLogger, createLogger, getLogger } from './logger'

// Default export: the default logger instance getter
import { getLogger } from './logger'
export default getLogger
