# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## important-rules

### 重要规则，每次执行任务前都需要严格遵守下面的规则

- 每次执行任务前，都要输出`melody, Codex开始执行任务了`，执行任务前需要阅读`docs/tasks`
- 不要试图一次性解决所有问题，一步步推进
- 每次实现一个新的feature，都需要新建单元测试
- 单元测试通过以后，才能执行`git commit`命令
- 每次提交一个新的`git commit`，都需要在`docs/milestone`下记录里程碑
- When fixing build failures, always trace the full cascade of errors before starting fixes. Check for: missing assets, invalid config values, environment variable interpolation issues, and code signing problems.
- This is a TypeScript project. Always use TypeScript (not JavaScript) for new files. Use strict typing — avoid `any` unless absolutely necessary.
- After fixing build or configuration issues, always run a verification build (`npm run build` or equivalent) before considering the task complete.

## Project Overview

本项目是一个**纯粹的系统容器**。

| 维度           | 说明                                                         |
| -------------- | ------------------------------------------------------------ |
| **核心职责**   | 负责操作系统层面的交互（启动、保活、全屏、系统热键屏蔽、关机/重启、更新管理） |
| **业务边界**   | **严禁包含任何医疗业务逻辑**。它不负责挂号、也不负责连接硬件（硬件由外部 WebSocket 服务负责） |
| **运行机制**   | 启动后，加载本地指定的静态资源目录（来自 Project B 构建后的 `dist`） |
| **跨平台支持** | 支持 Windows（生产部署）和 macOS（开发调试）                 |

## 项目结构

采用 **Monorepo + 模块化** 设计，将核心能力抽离为独立模块（packages），便于复用和扩展。

```text
kiosk-shell/
├── packages/                          # 📦 核心能力模块（可作为 submodule 管理）
│   ├── core/                          # 壳核心模块
│   │   ├── src/
│   │   │   ├── window.ts              # 窗口管理
│   │   │   ├── loader.ts              # 资源加载
│   │   │   ├── protocol.ts            # 🆕 自定义协议注册 (kiosk://)
│   │   │   ├── lifecycle.ts           # 应用生命周期
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── updater/                       # 更新模块
│   │   ├── src/
│   │   │   ├── shell-updater.ts       # 壳自身更新
│   │   │   ├── business-updater.ts    # 业务热更新 (🆕 A/B 双缓冲机制)
│   │   │   ├── rollback.ts            # 回滚逻辑
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── security/                      # 安全模块
│   │   ├── src/
│   │   │   ├── shortcuts.ts           # 快捷键屏蔽
│   │   │   ├── kiosk-mode.ts          # Kiosk 模式管理
│   │   │   ├── ipc-guard.ts           # 🆕 IPC 权限校验和频率限制
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── recovery/                      # 崩溃恢复模块
│   │   ├── src/
│   │   │   ├── crash-handler.ts       # 崩溃处理
│   │   │   ├── blank-detector.ts      # 白屏检测
│   │   │   ├── auto-retry.ts          # 自动重试
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── logger/                        # 日志模块
│   │   ├── src/
│   │   │   ├── file-transport.ts      # 文件日志 (🆕 已配置日志轮转)
│   │   │   ├── remote-transport.ts    # 远程上报
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── device/                        # 🆕 设备标识模块
│   │   ├── src/
│   │   │   ├── uuid-manager.ts        # UUID 持久化管理
│   │   │   ├── hardware-info.ts       # 硬件信息收集
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── watchdog/                      # 🆕 看门狗模块（Windows 专用）
│   │   ├── src/
│   │   │   ├── monitor.ts             # 进程监控
│   │   │   ├── heartbeat.ts           # 心跳检测
│   │   │   └── index.ts
│   │   ├── native/                    # 原生看门狗实现
│   │   │   └── watchdog.exe           # C#/Rust 编译的独立守护进程
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ipc/                           # IPC 通信模块
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── system.ts          # 系统控制（关机/重启）
│   │   │   │   ├── device.ts          # 设备信息
│   │   │   │   ├── update.ts          # 更新相关
│   │   │   │   └── debug.ts           # 调试功能
│   │   │   ├── preload.ts             # Preload 脚本
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── platform/                      # 平台适配模块 ⭐
│       ├── src/
│       │   ├── windows/
│       │   │   ├── shortcuts.ts       # Windows 快捷键
│       │   │   ├── system.ts          # Windows 系统操作
│       │   │   └── index.ts
│       │   ├── darwin/
│       │   │   ├── shortcuts.ts       # macOS 快捷键
│       │   │   ├── system.ts          # macOS 系统操作
│       │   │   └── index.ts
│       │   ├── adapter.ts             # 平台适配器
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── apps/                              # 📱 应用入口
│   └── kiosk/                         # 自助机应用
│       ├── src/
│       │   ├── main/
│       │   │   └── index.ts           # 主进程入口
│       │   └── preload/
│       │       └── index.ts           # Preload 入口
│       ├── resources/                 # 内置业务资源
│       │   └── renderer/
│       ├── build/                     # 打包资源
│       │   ├── icon.ico               # Windows 图标
│       │   ├── icon.icns              # macOS 图标
│       │   └── icon.png               # 通用图标
│       ├── electron-builder.yml
│       ├── package.json
│       └── tsconfig.json
│
├── shared/                            # 🔗 共享类型和工具
│   └── types/
│       ├── shell-api.d.ts             # ShellAPI 类型定义
│       ├── update.d.ts                # 更新相关类型
│       └── index.ts
│
├── scripts/                           # 🛠 构建脚本
│   ├── build.ts                       # 统一构建脚本
│   ├── dev.ts                         # 开发启动脚本
│   └── release.ts                     # 发布脚本
│
├── package.json                       # Root package.json (workspaces)
├── pnpm-workspace.yaml                # pnpm workspace 配置
├── tsconfig.base.json                 # 基础 TypeScript 配置
└── README.md
```


## Development Commands

```bash
# Install dependencies
pnpm install

# Run the Electron app (once main entry point is created)
pnpm exec electron .
```

## Tech Stack

| 模块         | 选型                         | 说明                                         |
| ------------ | ---------------------------- | -------------------------------------------- |
| **Core**     | **Electron** (Latest Stable) | 宿主环境,跨平台支持                         |
| **Language** | **TypeScript**               | 用于编写 Main Process 脚本,启用严格模式     |
| **Builder**  | **electron-builder**         | 负责打包为 `.exe` (Windows) / `.dmg` (macOS) |
| **Update**   | **electron-updater**         | 负责壳自身的版本更新                         |
| **Log**      | **electron-log**             | 系统级日志(记录崩溃、启动失败、白屏)，**已配置日志轮转** |
| **Plugin**   | **electron-localshortcut**   | 用于屏蔽/注册快捷键                          |
| **Download** | **electron-dl**              | 业务资源包下载                               |
| **Zip**      | **adm-zip**                  | 资源包解压                                   |
| **Protocol** | **Custom Protocol**          | `kiosk://` 协议，替代 `file://` 解决路径和 CORS 问题 |
| **Watchdog** | **独立看门狗进程**           | Windows 环境下的进程保活守护（可选：C#/Rust/Node.js） |

### 模块职责说明

| 模块              | 职责                             | 可独立使用 | 审计改进 |
| ----------------- | -------------------------------- | ---------- | -------- |
| `@kiosk/core`     | 窗口创建、资源加载、生命周期管理、**自定义协议** | ✅ | 🆕 协议优化 |
| `@kiosk/updater`  | 壳更新、业务热更新、回滚、**A/B双缓冲** | ✅ | 🆕 原子性更新 |
| `@kiosk/security` | 快捷键屏蔽、Kiosk 模式、**IPC权限控制** | ✅ | 🆕 权限增强 |
| `@kiosk/recovery` | 崩溃处理、白屏检测、自动恢复     | ✅ |  |
| `@kiosk/logger`   | 日志记录、远程上报、**日志轮转** | ✅ | 🆕 轮转策略 |
| `@kiosk/ipc`      | IPC 处理器、Preload 脚本         | ✅ |  |
| `@kiosk/platform` | 跨平台适配（Windows/macOS）      | ✅ |  |
| `@kiosk/device`   | **设备唯一标识UUID管理**         | ✅ | 🆕 新增模块 |
| `@kiosk/watchdog` | **进程保活守护（Windows专用）**   | ✅ | 🆕 新增模块 |

### Workspace 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'shared/*'
// package.json (root)
{
  "name": "kiosk-shell-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @kiosk/app dev",
    "build": "pnpm -r build",
    "build:win": "pnpm --filter @kiosk/app build:win",
    "build:mac": "pnpm --filter @kiosk/app build:mac"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

### 模块间依赖示例

```json
// apps/kiosk/package.json
{
  "name": "@kiosk/app",
  "dependencies": {
    "@kiosk/core": "workspace:*",
    "@kiosk/updater": "workspace:*",
    "@kiosk/security": "workspace:*",
    "@kiosk/recovery": "workspace:*",
    "@kiosk/logger": "workspace:*",
    "@kiosk/ipc": "workspace:*",
    "@kiosk/platform": "workspace:*"
  }
}
```
## 开发规范

### 禁止事项 (DO NOT)

- ❌ 禁止在壳项目中引入任何医疗业务相关的 npm 包
- ❌ 禁止在 Main Process 中处理患者数据
- ❌ 禁止关闭 `contextIsolation` 或开启 `nodeIntegration`
- ❌ 禁止跳过 hash 校验直接解压更新包
- ❌ 禁止删除备份目录（保留至少一个版本用于回滚）
- ❌ 禁止在代码中硬编码更新服务器地址（走配置文件）
- ❌ 禁止使用 `any` 类型（TypeScript 严格模式）
- ❌ 禁止在 packages 中直接引用 apps 的代码

### 必须事项 (MUST DO)

- ✅ 所有 IPC 通信必须通过 `contextBridge` 暴露
- ✅ 所有系统操作必须有日志记录
- ✅ 更新前必须备份当前版本
- ✅ 崩溃后必须有自动恢复机制
- ✅ 运维入口必须有密码保护
- ✅ 平台相关代码必须放在 `@kiosk/platform` 模块
- ✅ 新功能必须考虑 Windows/macOS 兼容性
