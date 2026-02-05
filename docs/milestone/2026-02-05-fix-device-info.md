# Milestone: 修复设备信息获取不准确

**日期**: 2026-02-05
**分支**: bug-fix
**Issue**: docs/issues/01-issue.md - Task 2

## 问题描述

ShellAPI 的 `getDeviceInfo` 方法返回的 Device UUID 为 `N/A`，原因是 IPC handler 中使用的是占位实现而非正式的 `@kiosk/device` 模块。

## 修复内容

### 1. 更新 IPC Device Handler

**文件**: `packages/ipc/src/handlers/device.ts`

将占位的 `getDeviceUuid()` 函数替换为使用 `@kiosk/device` 模块：

```typescript
import {
  getDeviceUuidAsync,
  isUuidManagerInitialized,
  initUuidManager,
} from '@kiosk/device';

async function getDeviceUuid(): Promise<string> {
  if (!isUuidManagerInitialized()) {
    await initUuidManager();
  }
  return await getDeviceUuidAsync();
}
```

### 2. 添加依赖

**文件**: `packages/ipc/package.json`

```json
{
  "dependencies": {
    "@kiosk/device": "workspace:*",
    ...
  }
}
```

### 3. 更新测试

**文件**: `packages/ipc/src/__tests__/handlers.test.ts`

添加 `@kiosk/device` 模块的 mock：

```typescript
vi.mock('@kiosk/device', () => ({
  getDeviceUuidAsync: vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000'),
  isUuidManagerInitialized: vi.fn().mockReturnValue(true),
  initUuidManager: vi.fn().mockResolvedValue(undefined),
}));
```

## 测试结果

- IPC 模块测试: 47 passed
- 全部测试: 662 passed

## 备注

关于 `Platform: MacIntel` 的问题：
- 后端 `os.arch()` 正确返回 `arm64`
- 后端 `os.platform()` 正确返回 `darwin`
- 如果渲染进程显示 `MacIntel`，可能是使用了浏览器的 `navigator.platform` 而非 `shellAPI.getDeviceInfo()`
