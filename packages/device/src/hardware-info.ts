/**
 * Hardware Info Collector
 * Collects hardware and system information using systeminformation
 */

import si from 'systeminformation'
import { getLogger } from '@kiosk/logger'
import type { HardwareInfo, HardwareInfoConfig, OsInfo, CpuInfo, MemoryInfo, NetworkInterface, DiskInfo } from './types'
import { DEFAULT_HARDWARE_INFO_CONFIG, ERROR_MESSAGES, LOG_MESSAGES } from './constants'
import { ByteUnit, formatBytes } from '@kiosk/shared'

/**
 * Get logger instance
 */
function getHardwareLogger() {
  return getLogger()
}

/**
 * Log info message with hardware prefix
 */
function logInfo(msg: string): void {
  getHardwareLogger().info(`[hardware] ${msg}`)
}

/**
 * Log error message with hardware prefix
 */
function logError(msg: string): void {
  getHardwareLogger().error(`[hardware] ${msg}`)
}

/**
 * Map si.osInfo().platform to Node.js process.platform convention
 */
function mapPlatform(siPlatform: string): string {
  const platformMap: Record<string, string> = {
    Windows: 'win32',
    Darwin: 'darwin',
    Linux: 'linux',
  }
  return platformMap[siPlatform] ?? siPlatform.toLowerCase()
}

/**
 * Get operating system information
 */
export async function getOsInfo(): Promise<OsInfo> {
  try {
    const info = await si.osInfo()
    return {
      platform: mapPlatform(info.platform),
      release: info.release,
      arch: info.arch,
      hostname: info.hostname,
      type: info.platform, // si.platform returns 'Windows', 'Darwin', 'Linux' — same as os.type()
      version: info.kernel,
    }
  } catch (error) {
    logError(`Failed to get OS info: ${error}`)
    return {
      platform: process.platform,
      release: '',
      arch: process.arch,
      hostname: '',
      type: '',
      version: '',
    }
  }
}

/**
 * Get CPU information
 */
export async function getCpuInfo(): Promise<CpuInfo> {
  try {
    const [info, load, cpuTemp] = await Promise.all([si.cpu(), si.currentLoad(), si.cpuTemperature()])
    return {
      model: info.brand || info.manufacturer || 'Unknown',
      cores: info.cores || 1,
      speed: Math.round(info.speed * 1000), // GHz → MHz
      usage: Math.round(load.currentLoad * 100) / 100,
      temperature: Math.round(cpuTemp.main || 40), // 某些主板可能读不到，给个默认值
    }
  } catch (error) {
    logError(`Failed to get CPU info: ${error}`)
    return {
      model: 'Unknown',
      cores: 1,
      speed: 0,
      usage: 0,
      temperature: 0,
    }
  }
}

/**
 * Get memory information
 */
export async function getMemoryInfo(): Promise<MemoryInfo> {
  try {
    const info = await si.mem()
    const total = formatBytes(info.total, ByteUnit.MB)
    const free = formatBytes(info.free, ByteUnit.MB)
    const used = formatBytes(info.used, ByteUnit.MB)

    return {
      total,
      free,
      used,
      usagePercent: info.total > 0 ? Math.round((info.used / info.total) * 100 * 100) / 100 : 0,
    }
  } catch (error) {
    logError(`Failed to get memory info: ${error}`)
    return {
      total: '0',
      free: '0',
      used: '0',
      usagePercent: 0,
    }
  }
}

/**
 * Get disk information
 */
export async function getDiskInfo(): Promise<DiskInfo[]> {
  try {
    const fileSystems = await si.fsSize() // 文件系统信息 (挂载点、总空间、已用空间)

    const result: DiskInfo[] = []

    fileSystems.forEach((fs) => {
      let total = formatBytes(fs.size, ByteUnit.MB) // MB
      let used = formatBytes(fs.used, ByteUnit.MB)
      let free = formatBytes(fs.available, ByteUnit.MB) // MB

      result.push({
        total,
        used,
        free,
        usagePercent: fs.used > 0 ? Math.round((fs.used / fs.size) * 100 * 100) / 100 : 0,
      })
    })

    return result
  } catch (error) {
    return [
      {
        total: '0',
        free: '0',
        used: '0',
        usagePercent: 0,
      },
    ]
  }
}

/**
 * Get network interfaces information
 * @param includeInternal - Whether to include internal/loopback interfaces
 */
export async function getNetworkInfo(includeInternal = false): Promise<NetworkInterface[]> {
  try {
    const [interfaces, defaultGateway] = await Promise.all([si.networkInterfaces(), si.networkGatewayDefault()])

    // si.networkInterfaces() can return a single object or an array
    const ifaceArray = Array.isArray(interfaces) ? interfaces : [interfaces]

    const result: NetworkInterface[] = []

    for (const iface of ifaceArray) {
      // Filter internal interfaces if not requested
      if (!includeInternal && iface.internal) continue

      const ipv4: string[] = []
      const ipv6: string[] = []

      if (iface.ip4) ipv4.push(iface.ip4)
      if (iface.ip6) ipv6.push(iface.ip6)

      // Only include interfaces that have addresses (or are explicitly internal)
      if (ipv4.length === 0 && ipv6.length === 0 && !iface.internal) continue

      const isDefault = iface.default === true

      result.push({
        name: iface.iface,
        mac: iface.mac || '00:00:00:00:00:00',
        ipv4,
        ipv6,
        internal: iface.internal,
        gateway: isDefault ? defaultGateway : '',
      })
    }

    return result
  } catch (error) {
    logError(`Failed to get network info: ${error}`)
    return []
  }
}

/**
 * Collect all hardware information
 * @param config - Optional configuration
 */
export async function collectHardwareInfo(config?: Partial<HardwareInfoConfig>): Promise<HardwareInfo> {
  const mergedConfig = { ...DEFAULT_HARDWARE_INFO_CONFIG, ...config }

  try {
    // Run all queries in parallel
    const [osInfo, cpuInfo, memoryInfo, diskInfo, networkInfo] = await Promise.all([
      getOsInfo(),
      getCpuInfo(),
      getMemoryInfo(),
      getDiskInfo(),
      mergedConfig.includeNetwork ? getNetworkInfo(mergedConfig.includeInternalInterfaces) : Promise.resolve([]),
    ])

    const hardwareInfo: HardwareInfo = {
      os: osInfo,
      cpu: cpuInfo,
      memory: memoryInfo,
      disk: diskInfo,
      network: networkInfo,
      collectedAt: new Date().toISOString(),
    }

    logInfo(LOG_MESSAGES.HARDWARE_INFO_COLLECTED)
    return hardwareInfo
  } catch {
    logError(ERROR_MESSAGES.HARDWARE_INFO_FAILED)
    throw new Error(ERROR_MESSAGES.HARDWARE_INFO_FAILED)
  }
}
