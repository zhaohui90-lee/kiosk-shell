/**
 * Hardware Info Collector
 * Collects hardware and system information
 */

import * as os from 'os';
import { getLogger } from '@kiosk/logger';
import type {
  HardwareInfo,
  HardwareInfoConfig,
  OsInfo,
  CpuInfo,
  MemoryInfo,
  NetworkInterface,
  DisplayInfo,
} from './types';
import {
  DEFAULT_HARDWARE_INFO_CONFIG,
  ERROR_MESSAGES,
  LOG_MESSAGES,
} from './constants';

/**
 * Get logger instance
 */
function getHardwareLogger() {
  return getLogger();
}

/**
 * Log info message with hardware prefix
 */
function logInfo(msg: string): void {
  getHardwareLogger().info(`[hardware] ${msg}`);
}

/**
 * Log error message with hardware prefix
 */
function logError(msg: string): void {
  getHardwareLogger().error(`[hardware] ${msg}`);
}

/**
 * Get operating system information
 */
export function getOsInfo(): OsInfo {
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    type: os.type(),
    version: os.version(),
  };
}

/**
 * Get CPU information
 */
export function getCpuInfo(): CpuInfo {
  const cpus = os.cpus();
  const firstCpu = cpus[0];

  return {
    model: firstCpu?.model ?? 'Unknown',
    cores: cpus.length,
    speed: firstCpu?.speed ?? 0,
  };
}

/**
 * Get memory information
 */
export function getMemoryInfo(): MemoryInfo {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;

  return {
    total,
    free,
    used,
    usagePercent: Math.round((used / total) * 100 * 100) / 100,
  };
}

/**
 * Get network interfaces information
 * @param includeInternal - Whether to include internal/loopback interfaces
 */
export function getNetworkInfo(includeInternal = false): NetworkInterface[] {
  const interfaces = os.networkInterfaces();
  const result: NetworkInterface[] = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;

    // Filter internal interfaces if not requested
    const filteredAddresses = addresses.filter(
      addr => includeInternal || !addr.internal
    );

    if (filteredAddresses.length === 0) continue;

    const networkInterface: NetworkInterface = {
      name,
      mac: filteredAddresses[0]?.mac ?? '00:00:00:00:00:00',
      ipv4: [],
      ipv6: [],
      internal: filteredAddresses[0]?.internal ?? false,
    };

    for (const addr of filteredAddresses) {
      if (addr.family === 'IPv4') {
        networkInterface.ipv4.push(addr.address);
      } else if (addr.family === 'IPv6') {
        networkInterface.ipv6.push(addr.address);
      }
    }

    result.push(networkInterface);
  }

  return result;
}

/**
 * Get display information (requires Electron)
 * Returns empty array if not in Electron environment
 */
export async function getDisplayInfo(): Promise<DisplayInfo[]> {
  try {
    // Try to import Electron's screen module
    const electron = await import('electron');
    const screen = electron.screen;

    if (!screen) {
      return [];
    }

    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    return displays.map((display, index) => ({
      id: display.id,
      label: `Display ${index + 1}`,
      bounds: {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
      },
      workArea: {
        x: display.workArea.x,
        y: display.workArea.y,
        width: display.workArea.width,
        height: display.workArea.height,
      },
      scaleFactor: display.scaleFactor,
      primary: display.id === primaryDisplay.id,
    }));
  } catch {
    // Not in Electron environment or screen not available
    return [];
  }
}

/**
 * Collect all hardware information
 * @param config - Optional configuration
 */
export async function collectHardwareInfo(
  config?: Partial<HardwareInfoConfig>
): Promise<HardwareInfo> {
  const mergedConfig = { ...DEFAULT_HARDWARE_INFO_CONFIG, ...config };

  try {
    const osInfo = getOsInfo();
    const cpuInfo = getCpuInfo();
    const memoryInfo = getMemoryInfo();

    let networkInfo: NetworkInterface[] = [];
    if (mergedConfig.includeNetwork) {
      networkInfo = getNetworkInfo(mergedConfig.includeInternalInterfaces);
    }

    let displayInfo: DisplayInfo[] = [];
    if (mergedConfig.includeDisplays) {
      displayInfo = await getDisplayInfo();
    }

    const hardwareInfo: HardwareInfo = {
      os: osInfo,
      cpu: cpuInfo,
      memory: memoryInfo,
      network: networkInfo,
      displays: displayInfo,
      collectedAt: new Date().toISOString(),
    };

    logInfo(LOG_MESSAGES.HARDWARE_INFO_COLLECTED);
    return hardwareInfo;
  } catch {
    logError(ERROR_MESSAGES.HARDWARE_INFO_FAILED);
    throw new Error(ERROR_MESSAGES.HARDWARE_INFO_FAILED);
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get a summary string of hardware info
 */
export async function getHardwareSummary(): Promise<string> {
  const info = await collectHardwareInfo();

  const lines = [
    `OS: ${info.os.type} ${info.os.release} (${info.os.arch})`,
    `CPU: ${info.cpu.model} (${info.cpu.cores} cores @ ${info.cpu.speed}MHz)`,
    `Memory: ${formatBytes(info.memory.used)} / ${formatBytes(info.memory.total)} (${info.memory.usagePercent}%)`,
  ];

  if (info.network.length > 0) {
    const primaryNetwork = info.network[0];
    if (primaryNetwork) {
      lines.push(`Network: ${primaryNetwork.name} (${primaryNetwork.ipv4.join(', ') || 'No IPv4'})`);
    }
  }

  if (info.displays.length > 0) {
    const primaryDisplay = info.displays.find(d => d.primary) || info.displays[0];
    if (primaryDisplay) {
      lines.push(`Display: ${primaryDisplay.bounds.width}x${primaryDisplay.bounds.height} @ ${primaryDisplay.scaleFactor}x`);
    }
  }

  return lines.join('\n');
}
