/**
 * Hardware Info unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOsInfo,
  getCpuInfo,
  getMemoryInfo,
  getNetworkInfo,
  collectHardwareInfo,
} from '../hardware-info';

// Mock logger
function createMockLogger() {
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => logger),
  };

  return logger;
}

vi.mock('@kiosk/logger', () => ({
  getLogger: () => createMockLogger(),
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
      mockSi.cpuTemperature.mockResolvedValue({ main: 48 });

      const cpuInfo = await getCpuInfo();

      expect(cpuInfo.model).toBe('Apple M1 Pro');
      expect(cpuInfo.cores).toBe(10);
      expect(cpuInfo.speed).toBe(3200); // GHz → MHz
      expect(cpuInfo.usage).toBe(42.56);
      expect(cpuInfo.temperature).toBe(48);
    });

    it('should fall back to manufacturer if brand is empty', async () => {
      mockSi.cpu.mockResolvedValue({
        brand: '',
        manufacturer: 'Intel',
        cores: 8,
        speed: 2.5,
      });
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 10 });
      mockSi.cpuTemperature.mockResolvedValue({ main: 55 });

      const cpuInfo = await getCpuInfo();
      expect(cpuInfo.model).toBe('Intel');
      expect(cpuInfo.temperature).toBe(55);
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

      expect(memInfo.total).toBe('16.00 GB');
      expect(memInfo.free).toBe('4.00 GB');
      expect(memInfo.used).toBe('12.00 GB');
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

      expect(memInfo.total).toBe('0');
      expect(memInfo.free).toBe('0');
      expect(memInfo.used).toBe('0');
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
      mockSi.cpuTemperature.mockResolvedValue({ main: 46 });
      mockSi.networkInterfaces.mockResolvedValue([]);
      mockSi.networkGatewayDefault.mockResolvedValue('');
      mockSi.fsSize.mockResolvedValue([]);
    });

    it('should collect all hardware information', async () => {
      const hardwareInfo = await collectHardwareInfo();

      expect(hardwareInfo.os).toBeDefined();
      expect(hardwareInfo.cpu).toBeDefined();
      expect(hardwareInfo.memory).toBeDefined();
      expect(hardwareInfo.network).toBeDefined();
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
      mockSi.cpuTemperature.mockResolvedValue({ main: 42 });

      await collectHardwareInfo({ includeNetwork: false, includeDisplays: false });

      expect(osResolved).toBe(true);
      expect(cpuResolved).toBe(true);
    });
  });
});
