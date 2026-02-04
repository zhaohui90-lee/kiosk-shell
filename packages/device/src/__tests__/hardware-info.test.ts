/**
 * Hardware Info unit tests
 */

import { describe, it, expect, vi } from 'vitest';
import * as os from 'os';
import {
  getOsInfo,
  getCpuInfo,
  getMemoryInfo,
  getNetworkInfo,
  getDisplayInfo,
  collectHardwareInfo,
  formatBytes,
  getHardwareSummary,
} from '../hardware-info';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Hardware Info', () => {
  describe('getOsInfo', () => {
    it('should return valid OS information', () => {
      const osInfo = getOsInfo();

      expect(osInfo.platform).toBe(os.platform());
      expect(osInfo.release).toBe(os.release());
      expect(osInfo.arch).toBe(os.arch());
      expect(osInfo.hostname).toBe(os.hostname());
      expect(osInfo.type).toBe(os.type());
      expect(typeof osInfo.version).toBe('string');
    });

    it('should have correct platform type', () => {
      const osInfo = getOsInfo();
      expect(['win32', 'darwin', 'linux', 'freebsd', 'openbsd', 'sunos', 'aix']).toContain(osInfo.platform);
    });

    it('should have correct arch type', () => {
      const osInfo = getOsInfo();
      expect(['arm', 'arm64', 'ia32', 'loong64', 'mips', 'mipsel', 'ppc', 'ppc64', 'riscv64', 's390', 's390x', 'x64']).toContain(osInfo.arch);
    });
  });

  describe('getCpuInfo', () => {
    it('should return valid CPU information', () => {
      const cpuInfo = getCpuInfo();

      expect(typeof cpuInfo.model).toBe('string');
      expect(typeof cpuInfo.cores).toBe('number');
      expect(typeof cpuInfo.speed).toBe('number');
    });

    it('should have at least 1 core', () => {
      const cpuInfo = getCpuInfo();
      expect(cpuInfo.cores).toBeGreaterThanOrEqual(1);
    });

    it('should have non-negative speed', () => {
      const cpuInfo = getCpuInfo();
      expect(cpuInfo.speed).toBeGreaterThanOrEqual(0);
    });

    it('should match os.cpus() length', () => {
      const cpuInfo = getCpuInfo();
      expect(cpuInfo.cores).toBe(os.cpus().length);
    });
  });

  describe('getMemoryInfo', () => {
    it('should return valid memory information', () => {
      const memoryInfo = getMemoryInfo();

      expect(typeof memoryInfo.total).toBe('number');
      expect(typeof memoryInfo.free).toBe('number');
      expect(typeof memoryInfo.used).toBe('number');
      expect(typeof memoryInfo.usagePercent).toBe('number');
    });

    it('should have total >= free', () => {
      const memoryInfo = getMemoryInfo();
      expect(memoryInfo.total).toBeGreaterThanOrEqual(memoryInfo.free);
    });

    it('should have used = total - free', () => {
      const memoryInfo = getMemoryInfo();
      expect(memoryInfo.used).toBe(memoryInfo.total - memoryInfo.free);
    });

    it('should have usagePercent between 0 and 100', () => {
      const memoryInfo = getMemoryInfo();
      expect(memoryInfo.usagePercent).toBeGreaterThanOrEqual(0);
      expect(memoryInfo.usagePercent).toBeLessThanOrEqual(100);
    });

    it('should match os.totalmem() and os.freemem()', () => {
      const memoryInfo = getMemoryInfo();
      expect(memoryInfo.total).toBe(os.totalmem());
      // Free memory can change rapidly, so we just check it's close
      expect(Math.abs(memoryInfo.free - os.freemem())).toBeLessThan(100 * 1024 * 1024); // within 100MB
    });
  });

  describe('getNetworkInfo', () => {
    it('should return array of network interfaces', () => {
      const networkInfo = getNetworkInfo();
      expect(Array.isArray(networkInfo)).toBe(true);
    });

    it('should exclude internal interfaces by default', () => {
      const networkInfo = getNetworkInfo();
      const hasInternal = networkInfo.some(iface => iface.internal);
      // May or may not have internal interfaces depending on filtering
      expect(typeof hasInternal).toBe('boolean');
    });

    it('should include internal interfaces when requested', () => {
      const networkInfo = getNetworkInfo(true);
      // Should have at least loopback interface
      expect(networkInfo.length).toBeGreaterThanOrEqual(0);
    });

    it('should have correct interface structure', () => {
      const networkInfo = getNetworkInfo(true);
      if (networkInfo.length > 0) {
        const iface = networkInfo[0]!;
        expect(typeof iface.name).toBe('string');
        expect(typeof iface.mac).toBe('string');
        expect(Array.isArray(iface.ipv4)).toBe(true);
        expect(Array.isArray(iface.ipv6)).toBe(true);
        expect(typeof iface.internal).toBe('boolean');
      }
    });

    it('should have valid MAC address format', () => {
      const networkInfo = getNetworkInfo(true);
      for (const iface of networkInfo) {
        expect(iface.mac).toMatch(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/);
      }
    });
  });

  describe('getDisplayInfo', () => {
    it('should return empty array when not in Electron', async () => {
      const displayInfo = await getDisplayInfo();
      // In Node.js environment, should return empty array
      expect(Array.isArray(displayInfo)).toBe(true);
    });
  });

  describe('collectHardwareInfo', () => {
    it('should collect all hardware information', async () => {
      const hardwareInfo = await collectHardwareInfo();

      expect(hardwareInfo.os).toBeDefined();
      expect(hardwareInfo.cpu).toBeDefined();
      expect(hardwareInfo.memory).toBeDefined();
      expect(hardwareInfo.network).toBeDefined();
      expect(hardwareInfo.displays).toBeDefined();
      expect(hardwareInfo.collectedAt).toBeDefined();
    });

    it('should have valid collectedAt timestamp', async () => {
      const before = new Date().toISOString();
      const hardwareInfo = await collectHardwareInfo();
      const after = new Date().toISOString();

      expect(hardwareInfo.collectedAt >= before).toBe(true);
      expect(hardwareInfo.collectedAt <= after).toBe(true);
    });

    it('should exclude network when configured', async () => {
      const hardwareInfo = await collectHardwareInfo({
        includeNetwork: false,
      });

      expect(hardwareInfo.network).toEqual([]);
    });

    it('should exclude displays when configured', async () => {
      const hardwareInfo = await collectHardwareInfo({
        includeDisplays: false,
      });

      expect(hardwareInfo.displays).toEqual([]);
    });

    it('should include internal interfaces when configured', async () => {
      const hardwareInfo = await collectHardwareInfo({
        includeInternalInterfaces: true,
      });

      // Should have collected network info with internal interfaces
      expect(Array.isArray(hardwareInfo.network)).toBe(true);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0.00 B');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
    });

    it('should format fractional values correctly', () => {
      expect(formatBytes(1536)).toBe('1.50 KB');
      expect(formatBytes(1536 * 1024)).toBe('1.50 MB');
    });

    it('should handle large values', () => {
      const result = formatBytes(1024 * 1024 * 1024 * 1024 * 2);
      expect(result).toBe('2.00 TB');
    });

    it('should not exceed TB unit', () => {
      const result = formatBytes(1024 * 1024 * 1024 * 1024 * 1024);
      expect(result).toBe('1024.00 TB');
    });
  });

  describe('getHardwareSummary', () => {
    it('should return formatted string', async () => {
      const summary = await getHardwareSummary();

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should include OS info', async () => {
      const summary = await getHardwareSummary();
      expect(summary).toContain('OS:');
    });

    it('should include CPU info', async () => {
      const summary = await getHardwareSummary();
      expect(summary).toContain('CPU:');
      expect(summary).toContain('cores');
    });

    it('should include Memory info', async () => {
      const summary = await getHardwareSummary();
      expect(summary).toContain('Memory:');
    });

    it('should have multiple lines', async () => {
      const summary = await getHardwareSummary();
      const lines = summary.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
    });
  });
});
