/**
 * Admin network test (ping) unit tests
 * Tests parsePingResult and isValidHost
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetAllRateLimits } from '../rate-limiter';

// Hoisted mocks
const { mockExecAsync } = vi.hoisted(() => {
  const mockExecAsync = vi.fn();
  return { mockExecAsync };
});

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: vi.fn(() => 'mock-session-token-abc123'),
  })),
}));

// Mock Electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  app: {
    quit: vi.fn(),
    relaunch: vi.fn(),
    getVersion: vi.fn(() => '1.0.0'),
    isPackaged: false,
    getLocale: vi.fn(() => 'en-US'),
    getAppPath: vi.fn(() => '/test/app'),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}));

// Mock @kiosk/logger
vi.mock('@kiosk/logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock @kiosk/platform
vi.mock('@kiosk/platform', () => ({
  getPlatformAdapter: vi.fn(() => ({
    getPlatform: vi.fn(() => 'darwin'),
    getSystemInfo: vi.fn(),
    shutdown: vi.fn(),
    restart: vi.fn(),
  })),
}));

// Mock child_process exec via util.promisify
vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecAsync),
}));

import {
  handleAdminLogin,
  handleAdminTestNetwork,
  parsePingResult,
  isValidHost,
  invalidateSession,
} from '../handlers/admin';
import { DEFAULT_ADMIN_PASSWORD } from '../constants';

describe('isValidHost', () => {
  it('should accept valid hostnames', () => {
    expect(isValidHost('www.baidu.com')).toBe(true);
    expect(isValidHost('example.com')).toBe(true);
    expect(isValidHost('my-host.example.org')).toBe(true);
    expect(isValidHost('localhost')).toBe(true);
    expect(isValidHost('sub.domain.example.com')).toBe(true);
  });

  it('should accept valid IPv4 addresses', () => {
    expect(isValidHost('192.168.1.1')).toBe(true);
    expect(isValidHost('8.8.8.8')).toBe(true);
    expect(isValidHost('10.0.0.1')).toBe(true);
  });

  it('should accept valid IPv6 addresses', () => {
    expect(isValidHost('::1')).toBe(true);
    expect(isValidHost('2001:db8::1')).toBe(true);
    expect(isValidHost('fe80::1')).toBe(true);
  });

  it('should reject invalid or malicious hosts', () => {
    expect(isValidHost('')).toBe(false);
    expect(isValidHost('example.com; rm -rf /')).toBe(false);
    expect(isValidHost('$(whoami)')).toBe(false);
    expect(isValidHost('host`id`')).toBe(false);
    expect(isValidHost('host | cat /etc/passwd')).toBe(false);
    expect(isValidHost('-n 1 127.0.0.1')).toBe(false);
  });
});

describe('parsePingResult', () => {
  it('should parse macOS ping output correctly', () => {
    const macosOutput = `PING www.baidu.com (198.18.0.25): 56 data bytes
64 bytes from 198.18.0.25: icmp_seq=0 ttl=64 time=0.431 ms
64 bytes from 198.18.0.25: icmp_seq=1 ttl=64 time=0.380 ms
64 bytes from 198.18.0.25: icmp_seq=2 ttl=64 time=0.350 ms
64 bytes from 198.18.0.25: icmp_seq=3 ttl=64 time=0.400 ms

--- www.baidu.com ping statistics ---
4 packets transmitted, 4 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 0.350/0.390/0.431/0.029 ms`;

    const result = parsePingResult(macosOutput, 'www.baidu.com', 'darwin');

    expect(result.success).toBe(true);
    expect(result.host).toBe('www.baidu.com');
    expect(result.sent).toBe(4);
    expect(result.received).toBe(4);
    expect(result.packetLoss).toBe(0.0);
    expect(result.minTime).toBeCloseTo(0.35);
    expect(result.avgTime).toBeCloseTo(0.39);
    expect(result.maxTime).toBeCloseTo(0.431);
    expect(result.timestamp).toBeDefined();
  });

  it('should parse Linux ping output correctly', () => {
    const linuxOutput = `PING www.baidu.com (220.181.38.150) 56(84) bytes of data.
64 bytes from 220.181.38.150: icmp_seq=1 ttl=52 time=25.3 ms
64 bytes from 220.181.38.150: icmp_seq=2 ttl=52 time=25.1 ms
64 bytes from 220.181.38.150: icmp_seq=3 ttl=52 time=24.9 ms
64 bytes from 220.181.38.150: icmp_seq=4 ttl=52 time=25.0 ms

--- www.baidu.com ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3003ms
rtt min/avg/max/mdev = 24.900/25.075/25.300/0.141 ms`;

    const result = parsePingResult(linuxOutput, 'www.baidu.com', 'linux');

    expect(result.success).toBe(true);
    expect(result.host).toBe('www.baidu.com');
    expect(result.sent).toBe(4);
    expect(result.received).toBe(4);
    expect(result.packetLoss).toBe(0);
    expect(result.minTime).toBeCloseTo(24.9);
    expect(result.avgTime).toBeCloseTo(25.075);
    expect(result.maxTime).toBeCloseTo(25.3);
  });

  it('should parse macOS ping output with packet loss', () => {
    const macosOutput = `PING www.baidu.com (198.18.0.25): 56 data bytes
64 bytes from 198.18.0.25: icmp_seq=0 ttl=64 time=0.431 ms
Request timeout for icmp_seq 1
64 bytes from 198.18.0.25: icmp_seq=2 ttl=64 time=0.350 ms
Request timeout for icmp_seq 3

--- www.baidu.com ping statistics ---
4 packets transmitted, 2 packets received, 50.0% packet loss
round-trip min/avg/max/stddev = 0.350/0.390/0.431/0.041 ms`;

    const result = parsePingResult(macosOutput, 'www.baidu.com', 'darwin');

    expect(result.success).toBe(true);
    expect(result.sent).toBe(4);
    expect(result.received).toBe(2);
    expect(result.packetLoss).toBe(50.0);
  });

  it('should parse Windows (Chinese locale) ping output correctly', () => {
    const windowsOutput = `正在 Ping www.baidu.com [220.181.38.150] 具有 32 字节的数据:
来自 220.181.38.150 的回复: 字节=32 时间=25ms TTL=52
来自 220.181.38.150 的回复: 字节=32 时间=24ms TTL=52
来自 220.181.38.150 的回复: 字节=32 时间=25ms TTL=52
来自 220.181.38.150 的回复: 字节=32 时间=24ms TTL=52

220.181.38.150 的 Ping 统计信息:
    数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)，
往返行程的估计时间(以毫秒为单位):
    最短 = 24ms，最长 = 25ms，平均 = 24ms`;

    const result = parsePingResult(windowsOutput, 'www.baidu.com', 'win32');

    expect(result.success).toBe(true);
    expect(result.sent).toBe(4);
    expect(result.received).toBe(4);
    expect(result.packetLoss).toBe(0);
    expect(result.minTime).toBe(24);
    expect(result.maxTime).toBe(25);
    expect(result.avgTime).toBe(24);
  });

  it('should handle output with no time statistics gracefully', () => {
    const output = `--- www.baidu.com ping statistics ---
4 packets transmitted, 0 packets received, 100.0% packet loss`;

    const result = parsePingResult(output, 'www.baidu.com', 'darwin');

    expect(result.success).toBe(true);
    expect(result.sent).toBe(4);
    expect(result.received).toBe(0);
    expect(result.packetLoss).toBe(100.0);
    expect(result.minTime).toBe(0);
    expect(result.avgTime).toBe(0);
    expect(result.maxTime).toBe(0);
  });
});

describe('handleAdminTestNetwork', () => {
  const mockEvent = {} as Electron.IpcMainInvokeEvent;
  const validToken = 'mock-session-token-abc123';

  beforeEach(async () => {
    resetAllRateLimits();
    vi.clearAllMocks();
    invalidateSession();
    // Login to get a valid session
    await handleAdminLogin(mockEvent, DEFAULT_ADMIN_PASSWORD);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should reject with invalid token', async () => {
    const result = await handleAdminTestNetwork(mockEvent, 'invalid-token', 'www.baidu.com');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid or expired session token');
  });

  it('should reject empty host', async () => {
    const result = await handleAdminTestNetwork(mockEvent, validToken, '');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid host parameter');
  });

  it('should reject malicious host (command injection)', async () => {
    const result = await handleAdminTestNetwork(mockEvent, validToken, 'example.com; rm -rf /');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid host parameter');
  });

  it('should execute ping and return parsed result', async () => {
    const macosOutput = `PING www.baidu.com (198.18.0.25): 56 data bytes
64 bytes from 198.18.0.25: icmp_seq=0 ttl=64 time=5.2 ms

--- www.baidu.com ping statistics ---
4 packets transmitted, 4 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 3.1/5.2/7.3/1.5 ms`;

    mockExecAsync.mockResolvedValueOnce({ stdout: macosOutput });

    const result = await handleAdminTestNetwork(mockEvent, validToken, 'www.baidu.com');

    expect(result.success).toBe(true);
    expect(result.host).toBe('www.baidu.com');
    expect(result.sent).toBe(4);
    expect(result.received).toBe(4);
    expect(result.packetLoss).toBe(0.0);
  });

  it('should handle ping command failure', async () => {
    mockExecAsync.mockRejectedValueOnce(new Error('ping: cannot resolve host'));

    const result = await handleAdminTestNetwork(mockEvent, validToken, 'nonexistent.invalid');

    expect(result.success).toBe(false);
    expect(result.message).toContain('ping: cannot resolve host');
  });
});
