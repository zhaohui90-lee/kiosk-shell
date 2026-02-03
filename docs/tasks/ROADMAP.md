# 开发路线图

## 任务指引

本文档追踪 kiosk-shell 项目的开发进度。每个任务完成后需要：

1. 编写单元测试并确保通过
2. 更新任务状态
3. 在 `docs/milestone/` 下记录里程碑

---

## Phase 1: 项目脚手架搭建

### 1.1 Monorepo 基础设施

- [x] 配置 pnpm-workspace.yaml
- [x] 配置 tsconfig.base.json (严格模式)
- [x] 创建 packages 目录结构
- [x] 创建 apps/kiosk 目录结构
- [x] 创建 shared/types 目录结构

### 1.2 构建系统

- [x] 配置 TypeScript 编译
- [x] 配置 electron-builder
- [x] 创建 dev 脚本 (scripts/dev.ts)
- [x] 创建 build 脚本 (scripts/build.ts)

---

## Phase 2: 核心模块实现

### 2.1 @kiosk/logger

**优先级**: P0 (其他模块依赖)

- [x] 实现 file-transport.ts (文件日志 + 轮转)
- [x] 实现 remote-transport.ts (远程上报接口)
- [x] 导出统一 logger 实例
- [x] 编写单元测试

### 2.2 @kiosk/platform

**优先级**: P0 (其他模块依赖)

- [x] 定义平台适配器接口 (adapter.ts)
- [x] 实现 Windows 平台 (windows/)
- [x] 实现 macOS 平台 (darwin/)
- [x] 编写单元测试

### 2.3 @kiosk/core

**优先级**: P0

- [x] 实现 window.ts (窗口管理)
- [x] 实现 loader.ts (资源加载)
- [x] 实现 protocol.ts (kiosk:// 协议)
- [x] 实现 lifecycle.ts (生命周期)
- [x] 编写单元测试

### 2.4 @kiosk/ipc

**优先级**: P1

- [x] 实现 preload.ts (contextBridge)
- [x] 实现 handlers/system.ts (关机/重启)
- [x] 实现 handlers/device.ts (设备信息)
- [x] 实现 handlers/debug.ts (DevTools)
- [x] 编写单元测试

---

## Phase 3: 安全与恢复

### 3.1 @kiosk/security

**优先级**: P1

- [ ] 实现 shortcuts.ts (快捷键屏蔽)
- [ ] 实现 kiosk-mode.ts (Kiosk 模式)
- [ ] 实现 ipc-guard.ts (IPC 权限)
- [ ] 编写单元测试

### 3.2 @kiosk/recovery

**优先级**: P1

- [ ] 实现 crash-handler.ts (崩溃处理)
- [ ] 实现 blank-detector.ts (白屏检测)
- [ ] 实现 auto-retry.ts (自动重试)
- [ ] 编写单元测试

---

## Phase 4: 更新系统

### 4.1 @kiosk/updater

**优先级**: P2

- [ ] 实现 shell-updater.ts (壳更新)
- [ ] 实现 business-updater.ts (业务热更新)
- [ ] 实现 rollback.ts (回滚机制)
- [ ] 实现 A/B 双缓冲机制
- [ ] 编写单元测试

---

## Phase 5: 设备与监控

### 5.1 @kiosk/device

**优先级**: P2

- [ ] 实现 uuid-manager.ts (UUID 管理)
- [ ] 实现 hardware-info.ts (硬件信息)
- [ ] 编写单元测试

### 5.2 @kiosk/watchdog (Windows)

**优先级**: P3

- [ ] 实现 monitor.ts (进程监控)
- [ ] 实现 heartbeat.ts (心跳检测)
- [ ] 开发独立看门狗进程 (native/)
- [ ] 编写单元测试

---

## Phase 6: 应用集成

### 6.1 apps/kiosk

**优先级**: P1 (随各模块同步)

- [ ] 实现 main/index.ts (主进程入口)
- [ ] 实现 preload/index.ts (Preload 入口)
- [x] 配置 electron-builder.yml
- [ ] 添加应用图标资源

### 6.2 集成测试

- [ ] 端到端启动测试
- [ ] 更新流程测试
- [ ] 崩溃恢复测试
- [ ] 跨平台打包测试

---

## 当前任务

> 使用此区域追踪当前正在进行的工作

**当前阶段**: Phase 3 - 安全与恢复

**下一步行动**:
1. ~~实现 @kiosk/platform 模块~~ ✅
2. ~~实现 @kiosk/core 模块~~ ✅
3. ~~实现 @kiosk/ipc 模块~~ ✅
4. 实现 @kiosk/security 模块
5. 实现 @kiosk/recovery 模块

---

## 任务状态说明

| 状态 | 含义 |
|------|------|
| `[ ]` | 未开始 |
| `[~]` | 进行中 |
| `[x]` | 已完成 |
| `[!]` | 已阻塞 |

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-02-03 | 完成 @kiosk/ipc 模块实现 |
| 2026-02-02 | 完成 @kiosk/core 模块实现 |
| 2026-02-02 | 完成 @kiosk/platform 模块实现 |
| 2026-02-02 | 创建路线图文档 |
