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

- [x] 实现 shortcuts.ts (快捷键屏蔽)
- [x] 实现 kiosk-mode.ts (Kiosk 模式)
- [x] 实现 ipc-guard.ts (IPC 权限)
- [x] 编写单元测试 (108 个测试全部通过)

### 3.2 @kiosk/recovery

**优先级**: P1

- [x] 实现 crash-handler.ts (崩溃处理)
- [x] 实现 blank-detector.ts (白屏检测)
- [x] 实现 auto-retry.ts (自动重试)
- [x] 编写单元测试 (132 个测试全部通过)

---

## Phase 4: 更新系统

### 4.1 @kiosk/updater

**优先级**: P2

- [x] 实现 shell-updater.ts (壳更新)
- [x] 实现 business-updater.ts (业务热更新)
- [x] 实现 rollback.ts (回滚机制)
- [x] 实现 A/B 双缓冲机制
- [x] 编写单元测试 (81 个测试全部通过)

---

## Phase 5: 设备与监控

### 5.1 @kiosk/device

**优先级**: P2

- [x] 实现 uuid-manager.ts (UUID 管理)
- [x] 实现 hardware-info.ts (硬件信息)
- [x] 编写单元测试 (78 个测试全部通过)

### 5.2 @kiosk/watchdog (Windows)

**优先级**: P3

- [x] 实现 monitor.ts (进程监控)
- [x] 实现 heartbeat.ts (心跳检测)
- [ ] 开发独立看门狗进程 (native/) - 待后续实现
- [x] 编写单元测试 (97 个测试全部通过)

---

## Phase 6: 应用集成

### 6.1 apps/kiosk

**优先级**: P1 (随各模块同步)

- [x] 实现 main/index.ts (主进程入口)
- [x] 实现 preload/index.ts (Preload 入口)
- [x] 配置 electron-builder.yml
- [x] 添加应用图标资源 (SVG 源文件, renderer/index.html)

### 6.2 集成测试

- [x] 基础集成测试 (662 个测试全部通过)
- [ ] 端到端启动测试 (待后续实现)
- [ ] 更新流程测试 (待后续实现)
- [ ] 崩溃恢复测试 (待后续实现)
- [ ] 跨平台打包测试 (待后续实现)

---

## 当前任务

> 使用此区域追踪当前正在进行的工作

**当前阶段**: Phase 6 已完成 ✅

**下一步行动**:
1. ~~实现 @kiosk/platform 模块~~ ✅
2. ~~实现 @kiosk/core 模块~~ ✅
3. ~~实现 @kiosk/ipc 模块~~ ✅
4. ~~实现 @kiosk/security 模块~~ ✅
5. ~~实现 @kiosk/recovery 模块~~ ✅
6. ~~实现 @kiosk/updater 模块~~ ✅
7. ~~实现 @kiosk/device 模块~~ ✅
8. ~~实现 @kiosk/watchdog 模块~~ ✅
9. ~~实现 apps/kiosk 主进程入口~~ ✅

**项目核心功能已完成！** 后续可进行:
- 生成正式应用图标 (ico/icns)
- 完善端到端测试
- 跨平台打包测试

---

## Bug 修复阶段

> 详见: [bugfix-01-issue.md](./bugfix-01-issue.md)

### Issue 01 修复任务

- [x] Task 1: 实现开发者模式开关 (P1)
- [x] Task 2: 修复设备信息获取不准确 (P0)
- [x] Task 3: 修复 canvas 元素不渲染 (P1)
- [x] Task 4: 新增白名单功能 (P1)

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
| 2026-02-04 | 修复应用启动问题: preload 上下文检测 + ProtocolHandler 路径 |
| 2026-02-04 | **完成 Phase 6: 应用集成** (662 个测试全部通过) |
| 2026-02-04 | 实现 apps/kiosk 主进程入口和 preload 脚本 |
| 2026-02-04 | 完成 @kiosk/watchdog 模块实现 (97 个测试) |
| 2026-02-04 | 完成 @kiosk/device 模块实现 (78 个测试) |
| 2026-02-03 | 完成 @kiosk/updater 模块实现 |
| 2026-02-03 | 完成 @kiosk/recovery 模块实现 |
| 2026-02-03 | 完成 @kiosk/security 模块实现 |
| 2026-02-03 | 完成 @kiosk/ipc 模块实现 |
| 2026-02-02 | 完成 @kiosk/core 模块实现 |
| 2026-02-02 | 完成 @kiosk/platform 模块实现 |
| 2026-02-02 | 创建路线图文档 |
