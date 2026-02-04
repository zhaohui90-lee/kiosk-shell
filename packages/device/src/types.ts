/**
 * @kiosk/device type definitions
 * Device identification and hardware info types
 */

/**
 * UUID storage location options
 */
export type UuidStorageLocation = 'userData' | 'appData' | 'custom';

/**
 * UUID generation method
 */
export type UuidGenerationMethod = 'random' | 'hardware-based';

/**
 * UUID manager configuration
 */
export interface UuidManagerConfig {
  /** Storage location for the UUID file */
  storageLocation: UuidStorageLocation;
  /** Custom storage path (only used when storageLocation is 'custom') */
  customPath?: string;
  /** UUID file name */
  fileName: string;
  /** UUID generation method */
  generationMethod: UuidGenerationMethod;
  /** Whether to cache UUID in memory after first read */
  cacheInMemory: boolean;
}

/**
 * UUID data structure stored in file
 */
export interface UuidData {
  /** The device UUID */
  uuid: string;
  /** When the UUID was created (ISO string) */
  createdAt: string;
  /** UUID generation method used */
  generationMethod: UuidGenerationMethod;
  /** Application version when UUID was generated */
  appVersion?: string;
}

/**
 * UUID manager state
 */
export interface UuidManagerState {
  /** Whether the UUID manager is initialized */
  initialized: boolean;
  /** Current UUID (cached) */
  cachedUuid: string | null;
  /** Storage file path */
  storagePath: string | null;
}

/**
 * Operating system info
 */
export interface OsInfo {
  /** Platform identifier (win32, darwin, linux) */
  platform: NodeJS.Platform;
  /** OS release version */
  release: string;
  /** OS architecture (x64, arm64, etc) */
  arch: string;
  /** OS hostname */
  hostname: string;
  /** OS type (Windows_NT, Darwin, Linux) */
  type: string;
  /** OS version string */
  version: string;
}

/**
 * CPU information
 */
export interface CpuInfo {
  /** CPU model name */
  model: string;
  /** Number of CPU cores */
  cores: number;
  /** CPU speed in MHz */
  speed: number;
}

/**
 * Memory information
 */
export interface MemoryInfo {
  /** Total memory in bytes */
  total: number;
  /** Free memory in bytes */
  free: number;
  /** Used memory in bytes */
  used: number;
  /** Memory usage percentage (0-100) */
  usagePercent: number;
}

/**
 * Network interface information
 */
export interface NetworkInterface {
  /** Interface name */
  name: string;
  /** MAC address */
  mac: string;
  /** IPv4 addresses */
  ipv4: string[];
  /** IPv6 addresses */
  ipv6: string[];
  /** Whether this is an internal interface */
  internal: boolean;
}

/**
 * Display/Monitor information
 */
export interface DisplayInfo {
  /** Display ID */
  id: number;
  /** Display label */
  label: string;
  /** Display bounds (x, y, width, height) */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Work area bounds (excluding taskbar, dock, etc) */
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Scale factor */
  scaleFactor: number;
  /** Whether this is the primary display */
  primary: boolean;
}

/**
 * Complete hardware information
 */
export interface HardwareInfo {
  /** Operating system info */
  os: OsInfo;
  /** CPU information */
  cpu: CpuInfo;
  /** Memory information */
  memory: MemoryInfo;
  /** Network interfaces */
  network: NetworkInterface[];
  /** Display information */
  displays: DisplayInfo[];
  /** Collection timestamp */
  collectedAt: string;
}

/**
 * Hardware info collector configuration
 */
export interface HardwareInfoConfig {
  /** Whether to include network information */
  includeNetwork: boolean;
  /** Whether to include display information */
  includeDisplays: boolean;
  /** Whether to include internal network interfaces */
  includeInternalInterfaces: boolean;
}

/**
 * Device identification result
 */
export interface DeviceIdentification {
  /** Device UUID */
  uuid: string;
  /** Hardware information */
  hardware: HardwareInfo;
}
