/**
 * Hardware Info unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOsInfo,
  getCpuInfo,
  getMemoryInfo,
  getNetworkInfo,
  getDisplayInfo,
  getSystemMetrics,
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

// Mock systeminformation
const mockSi = {
  osInfo: vi.fn(),
  cpu: vi.fn(),
  mem: vi.fn(),
  networkInterfaces: vi.fn(),
  networkGatewayDefault: vi.fn(),
  graphics: vi.fn(),
  currentLoad: vi.fn(),
  fsSize: vi.fn(),
  cpuTemperature: vi.fn(),
};

vi.mock('systeminformation', () => ({
  default: {
    osInfo: (...args: unknown[]) => mockSi.osInfo(...args),
    cpu: (...args: unknown[]) => mockSi.cpu(...args),
    mem: (...args: unknown[]) => mockSi.mem(...args),
    networkInterfaces: (...args: unknown[]) => mockSi.networkInterfaces(...args),
    networkGatewayDefault: (...args: unknown[]) => mockSi.networkGatewayDefault(...args),
    graphics: (...args: unknown[]) => mockSi.graphics(...args),
    currentLoad: (...args: unknown[]) => mockSi.currentLoad(...args),
    fsSize: (...args: unknown[]) => mockSi.fsSize(...args),
    cpuTemperature: (...args: unknown[]) => mockSi.cpuTemperature(...args),
  },
}));

// Mock electron (always fail to import — not in Electron env)
vi.mock('electron', () => {
  throw new Error('Not in Electron');
});

describe('Hardware Info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOsInfo', () => {
    it('should return OS info from systeminformation', async () => {
      mockSi.osInfo.mockResolvedValue({
        platform: 'Darwin',
        release: '24.6.0',
        arch: 'arm64',
        hostname: 'test-host',
        kernel: '24.6.0',
      });

      const osInfo = await getOsInfo();

      expect(osInfo.platform).toBe('darwin');
      expect(osInfo.release).toBe('24.6.0');
      expect(osInfo.arch).toBe('arm64');
      expect(osInfo.hostname).toBe('test-host');
      expect(osInfo.type).toBe('Darwin');
      expect(osInfo.version).toBe('24.6.0');
    });

    it('should map Windows platform correctly', async () => {
      mockSi.osInfo.mockResolvedValue({
        platform: 'Windows',
        release: '10.0.19045',
        arch: 'x64',
        hostname: 'win-host',
        kernel: '10.0.19045',
      });

      const osInfo = await getOsInfo();
      expect(osInfo.platform).toBe('win32');
    });

    it('should map Linux platform correctly', async () => {
      mockSi.osInfo.mockResolvedValue({
        platform: 'Linux',
        release: '6.1.0',
        arch: 'x64',
        hostname: 'linux-host',
        kernel: '6.1.0',
      });

      const osInfo = await getOsInfo();
      expect(osInfo.platform).toBe('linux');
    });

    it('should return fallback on error', async () => {
      mockSi.osInfo.mockRejectedValue(new Error('si failed'));

      const osInfo = await getOsInfo();

      expect(osInfo.platform).toBe(process.platform);
      expect(osInfo.arch).toBe(process.arch);
      expect(osInfo.release).toBe('');
    });
  });

  describe('getCpuInfo', () => {
    it('should return CPU info from systeminformation', async () => {
      mockSi.cpu.mockResolvedValue({
        brand: 'Apple M1 Pro',
        manufacturer: 'Apple',
        cores: 10,
        speed: 3.2,
      });
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 42.56 });

      const cpuInfo = await getCpuInfo();

      expect(cpuInfo.model).toBe('Apple M1 Pro');
      expect(cpuInfo.cores).toBe(10);
      expect(cpuInfo.speed).toBe(3200); // GHz → MHz
      expect(cpuInfo.usage).toBe(42.56);
    });

    it('should fall back to manufacturer if brand is empty', async () => {
      mockSi.cpu.mockResolvedValue({
        brand: '',
        manufacturer: 'Intel',
        cores: 8,
        speed: 2.5,
      });
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 10 });

      const cpuInfo = await getCpuInfo();
      expect(cpuInfo.model).toBe('Intel');
    });

    it('should return fallback on error', async () => {
      mockSi.cpu.mockRejectedValue(new Error('si failed'));

      const cpuInfo = await getCpuInfo();

      expect(cpuInfo.model).toBe('Unknown');
      expect(cpuInfo.cores).toBe(1);
      expect(cpuInfo.speed).toBe(0);
      expect(cpuInfo.usage).toBe(0);
    });
  });

  describe('getMemoryInfo', () => {
    it('should return memory info from systeminformation', async () => {
      mockSi.mem.mockResolvedValue({
        total: 16 * 1024 * 1024 * 1024,
        free: 4 * 1024 * 1024 * 1024,
        used: 12 * 1024 * 1024 * 1024,
      });

      const memInfo = await getMemoryInfo();

      expect(memInfo.total).toBe(16 * 1024 * 1024 * 1024);
      expect(memInfo.free).toBe(4 * 1024 * 1024 * 1024);
      expect(memInfo.used).toBe(12 * 1024 * 1024 * 1024);
      expect(memInfo.usagePercent).toBe(75);
    });

    it('should handle zero total memory gracefully', async () => {
      mockSi.mem.mockResolvedValue({
        total: 0,
        free: 0,
        used: 0,
      });

      const memInfo = await getMemoryInfo();
      expect(memInfo.usagePercent).toBe(0);
    });

    it('should return fallback on error', async () => {
      mockSi.mem.mockRejectedValue(new Error('si failed'));

      const memInfo = await getMemoryInfo();

      expect(memInfo.total).toBe(0);
      expect(memInfo.free).toBe(0);
      expect(memInfo.used).toBe(0);
      expect(memInfo.usagePercent).toBe(0);
    });
  });

  describe('getNetworkInfo', () => {
    const mockInterfaces = [
      {
        iface: 'en0',
        mac: 'aa:bb:cc:dd:ee:ff',
        ip4: '192.168.1.100',
        ip6: 'fe80::1',
        internal: false,
        default: true,
      },
      {
        iface: 'lo0',
        mac: '00:00:00:00:00:00',
        ip4: '127.0.0.1',
        ip6: '::1',
        internal: true,
        default: false,
      },
    ];

    it('should return network interfaces from systeminformation', async () => {
      mockSi.networkInterfaces.mockResolvedValue(mockInterfaces);
      mockSi.networkGatewayDefault.mockResolvedValue('192.168.1.1');

      const networkInfo = await getNetworkInfo();

      expect(networkInfo).toHaveLength(1); // excludes internal by default
      expect(networkInfo[0]!.name).toBe('en0');
      expect(networkInfo[0]!.mac).toBe('aa:bb:cc:dd:ee:ff');
      expect(networkInfo[0]!.ipv4).toEqual(['192.168.1.100']);
      expect(networkInfo[0]!.ipv6).toEqual(['fe80::1']);
      expect(networkInfo[0]!.gateway).toBe('192.168.1.1');
    });

    it('should include internal interfaces when requested', async () => {
      mockSi.networkInterfaces.mockResolvedValue(mockInterfaces);
      mockSi.networkGatewayDefault.mockResolvedValue('192.168.1.1');

      const networkInfo = await getNetworkInfo(true);

      expect(networkInfo).toHaveLength(2);
      const loopback = networkInfo.find(i => i.name === 'lo0');
      expect(loopback).toBeDefined();
      expect(loopback!.internal).toBe(true);
    });

    it('should handle single interface object (not array)', async () => {
      mockSi.networkInterfaces.mockResolvedValue(mockInterfaces[0]);
      mockSi.networkGatewayDefault.mockResolvedValue('192.168.1.1');

      const networkInfo = await getNetworkInfo();

      expect(networkInfo).toHaveLength(1);
      expect(networkInfo[0]!.name).toBe('en0');
    });

    it('should only set gateway on default interface', async () => {
      mockSi.networkInterfaces.mockResolvedValue([
        { ...mockInterfaces[0], default: true },
        { iface: 'en1', mac: '11:22:33:44:55:66', ip4: '10.0.0.1', ip6: '', internal: false, default: false },
      ]);
      mockSi.networkGatewayDefault.mockResolvedValue('192.168.1.1');

      const networkInfo = await getNetworkInfo();

      const defaultIface = networkInfo.find(i => i.name === 'en0');
      const otherIface = networkInfo.find(i => i.name === 'en1');
      expect(defaultIface!.gateway).toBe('192.168.1.1');
      expect(otherIface!.gateway).toBe('');
    });

    it('should return empty array on error', async () => {
      mockSi.networkInterfaces.mockRejectedValue(new Error('si failed'));

      const networkInfo = await getNetworkInfo();
      expect(networkInfo).toEqual([]);
    });
  });

  describe('getDisplayInfo', () => {
    it('should fall back to si.graphics() when not in Electron', async () => {
      mockSi.graphics.mockResolvedValue({
        displays: [
          {
            model: 'Built-in Display',
            positionX: 0,
            positionY: 0,
            resolutionX: 2560,
            resolutionY: 1600,
            main: true,
          },
        ],
      });

      const displayInfo = await getDisplayInfo();

      expect(displayInfo).toHaveLength(1);
      expect(displayInfo[0]!.label).toBe('Built-in Display');
      expect(displayInfo[0]!.bounds.width).toBe(2560);
      expect(displayInfo[0]!.bounds.height).toBe(1600);
      expect(displayInfo[0]!.scaleFactor).toBe(1);
      expect(displayInfo[0]!.primary).toBe(true);
    });

    it('should return empty array when both Electron and si.graphics() fail', async () => {
      mockSi.graphics.mockRejectedValue(new Error('si failed'));

      const displayInfo = await getDisplayInfo();
      expect(displayInfo).toEqual([]);
    });

    it('should return empty array when si.graphics() has no displays', async () => {
      mockSi.graphics.mockResolvedValue({ displays: [] });

      const displayInfo = await getDisplayInfo();
      expect(displayInfo).toEqual([]);
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics from systeminformation', async () => {
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 45.6 });
      mockSi.mem.mockResolvedValue({ free: 4 * 1024 * 1024 * 1024, total: 16 * 1024 * 1024 * 1024 });
      mockSi.fsSize.mockResolvedValue([{ used: 100 * 1024 * 1024 * 1024, size: 500 * 1024 * 1024 * 1024 }]);
      mockSi.cpuTemperature.mockResolvedValue({ main: 55 });

      const metrics = await getSystemMetrics();

      expect(metrics.cpuUsage).toBe(46);
      expect(metrics.memFree).toBe(4096);
      expect(metrics.memTotal).toBe(16384);
      expect(metrics.diskUsed).toBe(100);
      expect(metrics.diskTotal).toBe(500);
      expect(metrics.temperature).toBe(55);
    });

    it('should return fallback on error', async () => {
      mockSi.currentLoad.mockRejectedValue(new Error('si failed'));

      const metrics = await getSystemMetrics();

      expect(metrics.cpuUsage).toBe(0);
      expect(metrics.memFree).toBe(0);
      expect(metrics.memTotal).toBe(0);
    });
  });

  describe('collectHardwareInfo', () => {
    beforeEach(() => {
      // Set up default mocks for all si calls
      mockSi.osInfo.mockResolvedValue({
        platform: 'Darwin',
        release: '24.6.0',
        arch: 'arm64',
        hostname: 'test-host',
        kernel: '24.6.0',
      });
      mockSi.cpu.mockResolvedValue({
        brand: 'Apple M1',
        manufacturer: 'Apple',
        cores: 8,
        speed: 3.2,
      });
      mockSi.mem.mockResolvedValue({
        total: 16 * 1024 * 1024 * 1024,
        free: 4 * 1024 * 1024 * 1024,
        used: 12 * 1024 * 1024 * 1024,
      });
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 25 });
      mockSi.networkInterfaces.mockResolvedValue([]);
      mockSi.networkGatewayDefault.mockResolvedValue('');
      mockSi.graphics.mockResolvedValue({ displays: [] });
    });

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
      // networkInterfaces should not have been called
      expect(mockSi.networkInterfaces).not.toHaveBeenCalled();
    });

    it('should exclude displays when configured', async () => {
      const hardwareInfo = await collectHardwareInfo({
        includeDisplays: false,
      });

      expect(hardwareInfo.displays).toEqual([]);
    });

    it('should include internal interfaces when configured', async () => {
      const internalIface = {
        iface: 'lo0',
        mac: '00:00:00:00:00:00',
        ip4: '127.0.0.1',
        ip6: '::1',
        internal: true,
        default: false,
      };
      mockSi.networkInterfaces.mockResolvedValue([internalIface]);

      const hardwareInfo = await collectHardwareInfo({
        includeInternalInterfaces: true,
      });

      expect(Array.isArray(hardwareInfo.network)).toBe(true);
    });

    it('should use Promise.all for parallel execution', async () => {
      // All si calls should be initiated before any resolves
      let osResolved = false;
      let cpuResolved = false;

      mockSi.osInfo.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            osResolved = true;
            resolve({
              platform: 'Darwin', release: '24.6.0', arch: 'arm64',
              hostname: 'test-host', kernel: '24.6.0',
            });
          }, 10);
        });
      });

      mockSi.cpu.mockImplementation(() => {
        // CPU call should start before OS resolves (parallel)
        expect(osResolved).toBe(false);
        cpuResolved = true;
        return Promise.resolve({
          brand: 'Apple M1', manufacturer: 'Apple', cores: 8, speed: 3.2,
        });
      });
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 20 });

      await collectHardwareInfo({ includeNetwork: false, includeDisplays: false });

      expect(osResolved).toBe(true);
      expect(cpuResolved).toBe(true);
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
    beforeEach(() => {
      mockSi.osInfo.mockResolvedValue({
        platform: 'Darwin',
        release: '24.6.0',
        arch: 'arm64',
        hostname: 'test-host',
        kernel: '24.6.0',
      });
      mockSi.cpu.mockResolvedValue({
        brand: 'Apple M1',
        manufacturer: 'Apple',
        cores: 8,
        speed: 3.2,
      });
      mockSi.mem.mockResolvedValue({
        total: 16 * 1024 * 1024 * 1024,
        free: 4 * 1024 * 1024 * 1024,
        used: 12 * 1024 * 1024 * 1024,
      });
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 30 });
      mockSi.networkInterfaces.mockResolvedValue([
        { iface: 'en0', mac: 'aa:bb:cc:dd:ee:ff', ip4: '192.168.1.100', ip6: '', internal: false, default: true },
      ]);
      mockSi.networkGatewayDefault.mockResolvedValue('192.168.1.1');
      mockSi.graphics.mockResolvedValue({ displays: [] });
    });

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
