/**
 * @kiosk/core
 * Core module for window management, resource loading, and lifecycle
 */

// Export types
export type {
  WindowConfig,
  AdminWindowConfig,
  LoaderConfig,
  SlotId,
  SlotInfo,
  ProtocolResponse,
  LifecycleEvent,
  LifecycleHandler,
  AppState,
} from './types';

// Export window management
export {
  WindowManager,
  getWindowManager,
  resetWindowManager,
  createWindowManager,
} from './window';

// Export resource loader
export {
  ResourceLoader,
  getResourceLoader,
  resetResourceLoader,
  createResourceLoader,
} from './loader';

// Export protocol handler
export {
  KIOSK_PROTOCOL,
  ProtocolHandler,
  getProtocolHandler,
  resetProtocolHandler,
  createProtocolHandler,
} from './protocol';

// Export lifecycle manager
export {
  LifecycleManager,
  getLifecycleManager,
  resetLifecycleManager,
  createLifecycleManager,
} from './lifecycle';
