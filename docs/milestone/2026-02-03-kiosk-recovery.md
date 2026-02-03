# @kiosk/recovery 模块里程碑

**日期**: 2026-02-03

## 概述

完成 `@kiosk/recovery` 模块的实现，该模块提供崩溃处理、白屏检测和自动重试功能，用于保障 Kiosk 应用的稳定运行。

## 实现内容

### 1. 崩溃处理 (crash-handler.ts)

- **startCrashMonitoring**: 启动窗口崩溃监控
- **stopCrashMonitoring**: 停止崩溃监控
- **isRestartableCrash**: 判断崩溃是否可自动恢复
- **triggerCrashRecovery**: 手动触发崩溃恢复（测试用）
- **getRecentCrashes**: 获取最近的崩溃记录
- **clearCrashHistory**: 清除崩溃历史

支持的崩溃原因：
- 可恢复: `crashed`, `oom`, `abnormal-exit`
- 不可恢复: `normal-exit`, `killed`, `launch-failed`, `integrity-failure`

### 2. 白屏检测 (blank-detector.ts)

- **startBlankDetection**: 启动白屏检测
- **stopBlankDetection**: 停止白屏检测
- **checkBlankNow**: 立即执行白屏检查
- **getLastBlankResult**: 获取最后一次检测结果
- **resetBlankCount**: 重置连续空白计数

检测逻辑：
- 注入 JavaScript 检查页面内容高度
- 检测 `document.body` 是否存在
- 检测页面高度是否低于阈值（默认 100px）
- 支持连续检测阈值（默认 3 次连续空白才触发回调）

### 3. 自动重试 (auto-retry.ts)

- **startAutoRetry**: 启动自动重试
- **cancelAutoRetry**: 取消重试
- **calculateRetryDelay**: 计算重试延迟
- **getTotalRetries**: 获取总重试次数
- **resetRetryAttempts**: 重置重试计数

支持三种重试策略：
- `fixed`: 固定延迟
- `linear`: 线性递增延迟
- `exponential`: 指数退避延迟（默认）

### 4. 类型定义 (types.ts)

- `CrashReason`: 崩溃原因类型
- `CrashEvent`: 崩溃事件信息
- `CrashHandlerConfig`: 崩溃处理配置
- `BlankDetectionResult`: 白屏检测结果
- `BlankDetectorConfig`: 白屏检测配置
- `AutoRetryConfig`: 自动重试配置
- `RetryStrategy`: 重试策略类型
- `RecoveryResult`: 恢复结果

### 5. 常量 (constants.ts)

- `DEFAULT_CRASH_HANDLER_CONFIG`: 默认崩溃处理配置
- `DEFAULT_BLANK_DETECTOR_CONFIG`: 默认白屏检测配置
- `DEFAULT_AUTO_RETRY_CONFIG`: 默认自动重试配置
- `RESTARTABLE_CRASH_REASONS`: 可重启的崩溃原因
- `ERROR_MESSAGES`: 错误消息常量
- `getBlankDetectionScript`: 获取白屏检测脚本

## 测试覆盖

共 **132 个测试用例**，覆盖：

| 模块 | 测试数 |
|------|-------|
| constants.test.ts | 40 |
| crash-handler.test.ts | 34 |
| blank-detector.test.ts | 30 |
| auto-retry.test.ts | 28 |

## 默认配置

### 崩溃处理
- `autoRestart`: true
- `maxRestarts`: 3
- `restartWindowMs`: 60000 (1分钟)
- `restartDelayMs`: 1000 (1秒)

### 白屏检测
- `checkIntervalMs`: 5000 (5秒)
- `loadTimeoutMs`: 30000 (30秒)
- `minContentHeight`: 100 (像素)
- `blankThreshold`: 3 (连续次数)

### 自动重试
- `maxRetries`: 5
- `initialDelayMs`: 1000 (1秒)
- `maxDelayMs`: 30000 (30秒)
- `strategy`: 'exponential'
- `backoffMultiplier`: 2

## 使用示例

```typescript
import {
  startCrashMonitoring,
  startBlankDetection,
  startAutoRetry,
} from '@kiosk/recovery';

// 启动崩溃监控
startCrashMonitoring(mainWindow, {
  autoRestart: true,
  maxRestarts: 3,
  onCrash: (event) => {
    console.log('Crash detected:', event.reason);
  },
  onMaxRestartsExceeded: () => {
    console.error('Too many crashes, giving up');
  },
});

// 启动白屏检测
startBlankDetection(mainWindow, {
  checkIntervalMs: 5000,
  blankThreshold: 3,
  onBlankDetected: (result) => {
    console.warn('Blank screen detected:', result.reason);
    // 可以选择重新加载页面
    mainWindow.webContents.reload();
  },
});

// 手动触发自动重试
startAutoRetry(mainWindow, {
  strategy: 'exponential',
  maxRetries: 5,
  onRetrySuccess: () => {
    console.log('Retry successful');
  },
});
```

## 文件变更

- 新增: `packages/recovery/src/crash-handler.ts`
- 新增: `packages/recovery/src/blank-detector.ts`
- 新增: `packages/recovery/src/auto-retry.ts`
- 新增: `packages/recovery/src/types.ts`
- 新增: `packages/recovery/src/constants.ts`
- 更新: `packages/recovery/src/index.ts`
- 新增: `packages/recovery/src/__tests__/*.test.ts`

## 下一步

继续实现 Phase 4 的 `@kiosk/updater` 模块。
