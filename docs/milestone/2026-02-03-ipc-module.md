# @kiosk/ipc 模块实现

**日期**: 2026-02-03

## 完成内容

### 2.4 @kiosk/ipc (P1)

- [x] 实现 preload.ts (contextBridge)
- [x] 实现 handlers/system.ts (关机/重启)
- [x] 实现 handlers/device.ts (设备信息)
- [x] 实现 handlers/debug.ts (DevTools)
- [x] 编写单元测试 (40 个测试全部通过)

## 模块结构

```
packages/ipc/
├── src/
│   ├── __tests__/
│   │   ├── types.test.ts        # 类型和常量测试
│   │   ├── rate-limiter.test.ts # 频率限制测试
│   │   └── handlers.test.ts     # 处理器测试
│   ├── handlers/
│   │   ├── system.ts            # 系统控制（关机/重启）
│   │   ├── device.ts            # 设备信息
│   │   ├── debug.ts             # 调试功能（DevTools）
│   │   └── index.ts             # 处理器导出
│   ├── types.ts                 # 类型定义
│   ├── constants.ts             # 常量定义
│   ├── rate-limiter.ts          # 频率限制器
│   ├── preload.ts               # Preload 脚本
│   └── index.ts                 # 模块入口
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 功能清单

### IPC 通道（白名单）

| 通道 | 用途 | 频率限制 |
|------|------|----------|
| shell:systemShutdown | 系统关机 | 1次/60秒 |
| shell:systemRestart | 系统重启 | 1次/60秒 |
| shell:getDeviceInfo | 获取设备信息 | 无限制 |
| shell:requestUpdate | 请求更新检查 | 无限制 |
| shell:openDevTools | 打开开发工具 | 3次/60秒 |

### System Handlers (system.ts)

| 功能 | 说明 |
|------|------|
| handleSystemShutdown() | 处理关机请求（带频率限制） |
| handleSystemRestart() | 处理重启请求（带频率限制） |
| registerSystemHandlers() | 注册系统处理器 |
| unregisterSystemHandlers() | 注销系统处理器 |

### Device Handlers (device.ts)

| 功能 | 说明 |
|------|------|
| handleGetDeviceInfo() | 获取设备信息（UUID、平台、架构等） |
| registerDeviceHandlers() | 注册设备处理器 |
| unregisterDeviceHandlers() | 注销设备处理器 |

### Debug Handlers (debug.ts)

| 功能 | 说明 |
|------|------|
| handleOpenDevTools() | 打开 DevTools（需要密码验证） |
| setDebugPassword() | 设置调试密码 |
| registerDebugHandlers() | 注册调试处理器 |
| unregisterDebugHandlers() | 注销调试处理器 |

### Rate Limiter (rate-limiter.ts)

| 功能 | 说明 |
|------|------|
| checkRateLimit() | 检查请求是否允许 |
| resetRateLimit() | 重置特定通道的限制 |
| resetAllRateLimits() | 重置所有限制 |
| getRemainingCalls() | 获取剩余调用次数 |
| getTimeUntilReset() | 获取限制重置时间 |

### Preload Script (preload.ts)

| API | 说明 |
|-----|------|
| shellAPI.getDeviceInfo() | 获取设备信息 |
| shellAPI.requestUpdate() | 请求更新检查 |
| shellAPI.systemShutdown() | 系统关机 |
| shellAPI.systemRestart() | 系统重启 |
| shellAPI.openDevTools() | 打开开发工具 |

## 导出 API

```typescript
// 类型导出
export type {
  IpcChannel,
  RateLimitConfig,
  IpcHandler,
  HandlerOptions,
  SystemShutdownResult,
  SystemRestartResult,
  DeviceInfoResult,
  UpdateResult,
  DebugResult,
  RateLimiterState,
  PasswordVerifyResult,
  DeviceInfo,
  UpdateInfo,
}

// 常量
export { IPC_CHANNELS, RATE_LIMITS }
export { DEFAULT_DEBUG_PASSWORD, SHELL_API_NAMESPACE, PRELOAD_CONFIG, ERROR_MESSAGES }

// 频率限制器
export { checkRateLimit, resetRateLimit, resetAllRateLimits, getRemainingCalls, getTimeUntilReset }

// 处理器
export { registerSystemHandlers, unregisterSystemHandlers }
export { registerDeviceHandlers, unregisterDeviceHandlers }
export { registerDebugHandlers, unregisterDebugHandlers, setDebugPassword }

// 便捷函数
export { registerAllHandlers, unregisterAllHandlers }

// Preload
export { shellAPI, exposeShellAPI }
```

## 测试覆盖

- 类型和常量测试: 11 个
- 频率限制测试: 16 个
- 处理器测试: 13 个
- **总计: 40 个测试**

## 安全特性

1. **IPC 通道白名单**: 只允许预定义的通道
2. **频率限制**: 防止 DoS 攻击，特别是系统操作
3. **密码保护**: DevTools 访问需要密码验证
4. **contextBridge 隔离**: 渲染进程无法直接访问 Node.js API
5. **日志记录**: 所有操作都有日志追踪

## 下一步

继续 Phase 3 - 安全与恢复:

1. 实现 `@kiosk/security` 模块 (P1)
   - shortcuts.ts (快捷键屏蔽)
   - kiosk-mode.ts (Kiosk 模式)
   - ipc-guard.ts (IPC 权限)

2. 实现 `@kiosk/recovery` 模块 (P1)
   - crash-handler.ts (崩溃处理)
   - blank-detector.ts (白屏检测)
   - auto-retry.ts (自动重试)
