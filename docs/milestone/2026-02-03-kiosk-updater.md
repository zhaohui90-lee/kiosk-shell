# @kiosk/updater 模块里程碑

**日期**: 2026-02-03

## 概述

完成 `@kiosk/updater` 模块的实现，该模块提供壳应用更新、业务热更新和版本回滚功能，采用 A/B 双缓冲机制确保更新的原子性和可靠性。

## 实现内容

### 1. 壳更新 (shell-updater.ts)

基于 `electron-updater` 实现应用自身的更新功能：

- **initShellUpdater**: 初始化壳更新器
- **checkForShellUpdate**: 检查更新
- **downloadShellUpdate**: 下载更新
- **installShellUpdate**: 安装更新并重启
- **startAutoUpdateCheck**: 启动自动更新检查
- **stopAutoUpdateCheck**: 停止自动更新检查

支持功能：
- 自动下载更新
- 退出时自动安装
- 多渠道支持 (stable/beta/alpha)
- 下载进度回调

### 2. 业务热更新 (business-updater.ts)

实现业务资源包的热更新，采用 A/B 双缓冲机制：

- **initBusinessUpdater**: 初始化业务更新器
- **checkForBusinessUpdate**: 检查业务更新
- **downloadBusinessUpdate**: 下载业务更新包
- **applyBusinessUpdate**: 应用更新（切换到新 Slot）
- **getActiveSlotPath**: 获取当前活跃 Slot 路径

A/B 双缓冲机制：
- Slot A 和 Slot B 交替使用
- 更新时下载到非活跃 Slot
- 切换时原子性更改活跃 Slot 标记
- 失败时可快速回退到另一个 Slot

安全特性：
- SHA256 哈希校验
- 下载进度追踪
- 版本文件记录

### 3. 回滚机制 (rollback.ts)

实现版本备份和回滚功能：

- **initRollback**: 初始化回滚管理器
- **createBackup**: 创建版本备份
- **rollbackToVersion**: 回滚到指定版本
- **rollbackToPrevious**: 回滚到上一个版本
- **getAvailableBackups**: 获取可用备份列表
- **removeBackup**: 删除指定备份
- **clearAllBackups**: 清除所有备份

备份策略：
- 自动清理旧版本（默认保留 3 个）
- 按时间戳排序
- 持久化备份清单

### 4. 类型定义 (types.ts)

- `UpdateChannel`: 更新渠道类型
- `UpdateStatus`: 更新状态
- `ShellUpdateInfo`: 壳更新信息
- `ShellUpdaterConfig`: 壳更新配置
- `BusinessVersionInfo`: 业务版本信息
- `BufferSlot`: 缓冲槽类型 (A/B)
- `BufferSlotInfo`: 缓冲槽信息
- `BusinessUpdaterConfig`: 业务更新配置
- `RollbackConfig`: 回滚配置
- `VersionBackupInfo`: 版本备份信息
- `UpdateResult`: 更新结果

### 5. 常量 (constants.ts)

- `DEFAULT_SHELL_UPDATER_CONFIG`: 默认壳更新配置
- `DEFAULT_BUSINESS_UPDATER_CONFIG`: 默认业务更新配置
- `DEFAULT_ROLLBACK_CONFIG`: 默认回滚配置
- `BUFFER_SLOTS`: 缓冲槽标识
- `UPDATE_STATUS`: 更新状态常量
- `FILE_NAMES`: 文件名常量
- `ERROR_MESSAGES`: 错误消息
- `TIMEOUTS`: 超时配置
- `RETRY_CONFIG`: 重试配置

## 测试覆盖

共 **81 个测试用例**，覆盖：

| 模块 | 测试数 |
|------|-------|
| constants.test.ts | 25 |
| shell-updater.test.ts | 15 |
| business-updater.test.ts | 19 |
| rollback.test.ts | 22 |

## 默认配置

### 壳更新
- `channel`: 'stable'
- `autoDownload`: true
- `autoInstallOnQuit`: true
- `checkIntervalMs`: 3600000 (1小时)

### 业务更新
- `timeoutMs`: 30000 (30秒)
- `verifyHash`: true

### 回滚
- `maxVersions`: 3

## A/B 双缓冲工作流程

```
┌─────────────────────────────────────────────────────────┐
│                    A/B 双缓冲更新流程                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   当前状态: Slot A 活跃 (v1.0.0)                          │
│                                                         │
│   1. 检测到新版本 v1.1.0                                  │
│   2. 下载更新包到 Slot B                                  │
│   3. 校验 SHA256 哈希                                     │
│   4. 解压到 Slot B                                       │
│   5. 写入版本信息到 Slot B                                │
│   6. 原子切换: 更新 active-slot.json 为 B                  │
│                                                         │
│   结果: Slot B 活跃 (v1.1.0), Slot A 保留 (v1.0.0)        │
│                                                         │
│   回滚: 只需将 active-slot.json 改回 A                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 使用示例

```typescript
import {
  initShellUpdater,
  checkForShellUpdate,
  initBusinessUpdater,
  checkForBusinessUpdate,
  downloadBusinessUpdate,
  applyBusinessUpdate,
  initRollback,
  createBackup,
  rollbackToPrevious,
} from '@kiosk/updater';

// 初始化壳更新器
await initShellUpdater({
  updateServerUrl: 'https://updates.example.com',
  channel: 'stable',
  onUpdateAvailable: (info) => {
    console.log('Shell update available:', info.version);
  },
});

// 检查壳更新
await checkForShellUpdate();

// 初始化业务更新器
initBusinessUpdater({
  bufferBaseDir: '/path/to/buffers',
  versionCheckUrl: 'https://api.example.com/version',
  onUpdateReady: (slot, version) => {
    console.log(`Update ready in slot ${slot}: ${version}`);
  },
});

// 业务更新流程
const checkResult = await checkForBusinessUpdate();
if (checkResult.success && checkResult.version) {
  const downloadResult = await downloadBusinessUpdate();
  if (downloadResult.success) {
    // 创建备份
    const backupResult = createBackup(getActiveSlotPath(), getCurrentBusinessVersion());

    // 应用更新
    const applyResult = applyBusinessUpdate();

    if (!applyResult.success) {
      // 回滚
      rollbackToPrevious(getActiveSlotPath());
    }
  }
}
```

## 文件变更

- 新增: `packages/updater/src/types.ts`
- 新增: `packages/updater/src/constants.ts`
- 新增: `packages/updater/src/shell-updater.ts`
- 新增: `packages/updater/src/business-updater.ts`
- 新增: `packages/updater/src/rollback.ts`
- 更新: `packages/updater/src/index.ts`
- 新增: `packages/updater/src/__tests__/*.test.ts`

## 下一步

继续实现 Phase 5 的 `@kiosk/device` 模块。
