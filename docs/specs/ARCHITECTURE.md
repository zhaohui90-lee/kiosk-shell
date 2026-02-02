# 架构规格说明

## 概述

kiosk-shell 是一个纯粹的系统容器，专为医疗自助机设计。它负责操作系统层面的交互，严禁包含任何医疗业务逻辑。

## 架构原则

### 1. 业务边界隔离

```
┌─────────────────────────────────────────────────────────┐
│                    kiosk-shell (壳)                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │  系统层：启动、保活、全屏、热键屏蔽、关机/重启、更新  ││
│  └─────────────────────────────────────────────────────┘│
│                          │                               │
│                   kiosk:// 协议                          │
│                          │                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │  渲染层：加载外部静态资源 (来自 Project B 的 dist)   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 2. 模块依赖关系

```
                    ┌──────────────┐
                    │  @kiosk/app  │  (apps/kiosk)
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   core   │    │ security │    │ recovery │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  logger  │   │ platform │   │   ipc    │
    └──────────┘   └──────────┘   └──────────┘
```

### 3. 进程模型

```
┌─────────────────────────────────────────┐
│            Main Process                  │
│  ┌─────────────────────────────────────┐│
│  │  @kiosk/core      窗口管理          ││
│  │  @kiosk/updater   更新管理          ││
│  │  @kiosk/security  安全控制          ││
│  │  @kiosk/recovery  崩溃恢复          ││
│  │  @kiosk/logger    日志记录          ││
│  │  @kiosk/device    设备标识          ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
                    │
           contextBridge
                    │
┌─────────────────────────────────────────┐
│          Renderer Process                │
│  ┌─────────────────────────────────────┐│
│  │  window.shellAPI (受限 API)         ││
│  │  - getDeviceInfo()                  ││
│  │  - requestUpdate()                  ││
│  │  - systemShutdown()                 ││
│  │  - systemRestart()                  ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Watchdog Process (Windows)       │
│  ┌─────────────────────────────────────┐│
│  │  独立守护进程，监控主进程存活        ││
│  │  主进程异常退出时自动重启            ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

## 模块规格

### @kiosk/core

| 文件 | 职责 |
|------|------|
| `window.ts` | BrowserWindow 创建、全屏管理、devTools 控制 |
| `loader.ts` | 静态资源加载、路径解析 |
| `protocol.ts` | `kiosk://` 自定义协议注册 |
| `lifecycle.ts` | app 事件监听、退出流程 |

### @kiosk/updater

| 文件 | 职责 |
|------|------|
| `shell-updater.ts` | 壳自身版本更新 (electron-updater) |
| `business-updater.ts` | 业务资源热更新 (A/B 双缓冲) |
| `rollback.ts` | 更新失败回滚机制 |

### @kiosk/security

| 文件 | 职责 |
|------|------|
| `shortcuts.ts` | 系统快捷键屏蔽 (Alt+F4, Ctrl+Alt+Del 等) |
| `kiosk-mode.ts` | Kiosk 模式启用/禁用 |
| `ipc-guard.ts` | IPC 调用权限校验、频率限制 |

### @kiosk/platform

| 目录/文件 | 职责 |
|-----------|------|
| `windows/` | Windows 平台特定实现 |
| `darwin/` | macOS 平台特定实现 |
| `adapter.ts` | 平台无关的统一接口 |

## 安全模型

### IPC 通信

```typescript
// 允许的 IPC 通道（白名单）
const ALLOWED_CHANNELS = [
  'shell:getDeviceInfo',
  'shell:requestUpdate',
  'shell:systemShutdown',
  'shell:systemRestart',
  'shell:openDevTools',  // 需要密码验证
];

// 频率限制
const RATE_LIMITS = {
  'shell:systemShutdown': { maxCalls: 1, windowMs: 60000 },
  'shell:systemRestart': { maxCalls: 1, windowMs: 60000 },
};
```

### Electron 安全配置

```typescript
// BrowserWindow 配置
{
  webPreferences: {
    nodeIntegration: false,        // 必须关闭
    contextIsolation: true,        // 必须开启
    sandbox: true,                 // 建议开启
    preload: path.join(__dirname, 'preload.js'),
  }
}
```

## 更新机制

### A/B 双缓冲更新

```
业务资源目录结构：
userData/
├── business/
│   ├── slot-a/           # A 槽位
│   │   └── dist/
│   ├── slot-b/           # B 槽位
│   │   └── dist/
│   └── active.json       # 当前激活槽位标识
└── backup/
    └── last-working/     # 最后一个可用版本
```

### 更新流程

1. 检测到新版本，下载到非激活槽位
2. 校验 hash，解压
3. 切换 active.json 指向新槽位
4. 重新加载页面
5. 如果加载失败，自动回滚

## 日志规范

### 日志级别

| 级别 | 用途 |
|------|------|
| `error` | 崩溃、启动失败、更新失败 |
| `warn` | 白屏检测、资源加载超时 |
| `info` | 启动完成、更新成功、用户操作 |
| `debug` | 开发调试信息 |

### 日志轮转

```typescript
{
  maxSize: '10m',        // 单个文件最大 10MB
  maxFiles: '7d',        // 保留 7 天
  compress: true,        // 压缩旧日志
}
```

## 跨平台兼容

| 功能 | Windows | macOS |
|------|---------|-------|
| 快捷键屏蔽 | globalShortcut + 低级键盘钩子 | globalShortcut |
| 关机/重启 | `shutdown` 命令 | `osascript` |
| Kiosk 模式 | 任务栏隐藏 + 全屏 | 全屏 |
| 看门狗 | 独立 exe 进程 | launchd (可选) |
| 自启动 | 注册表 / 任务计划 | LoginItems |
