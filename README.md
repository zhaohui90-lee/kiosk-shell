## 一个自助壳项目

### 项目结构

采用 **Monorepo + 模块化** 设计，将核心能力抽离为独立模块（packages），便于复用和扩展。
```text
kiosk-shell/
├── apps/                              # 客户端启动模块
│   ├── kiosk/                         # 自助机
│   │   ├── build/                     # 构建产物
│   │   ├── resources/                 # 资源模块
│   │   │   ├── admin                  # 存放控制面板文件 `admin-panel`
│   │   ├── src/
│   │   │   ├── main/                  # 启动入口
│   │   │   ├── preload/               # 对外暴露API
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
│   │   │   ├── network-status.ts      # 网络状态
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
