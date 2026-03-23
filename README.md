# kiosk-shell

基于 Electron 的自助终端系统壳项目，负责窗口管理、资源加载、IPC、日志、恢复、安全控制、更新和设备标识等系统层能力。

这个仓库的边界很明确：

- 它是系统容器，不承载医疗业务逻辑。
- 它负责加载本地静态资源或指定 URL。
- 它支持 Windows 生产部署，也支持 macOS 开发调试。

## 核心能力

- Kiosk 窗口管理与生命周期控制
- `kiosk://` 自定义协议与资源加载
- 主进程 / Preload / IPC handler 分层
- 文件日志与远程日志上报
- 设备 UUID 与基础硬件信息采集
- 崩溃监控、白屏检测、自动恢复
- 平台适配与快捷键控制
- Shell 自更新与业务资源热更新
- RIME 输入法插件与虚拟键盘渲染

## 仓库结构

```text
kiosk-shell/
├── apps/
│   └── kiosk/                        # Electron 应用入口
│       ├── src/main/                # 主进程
│       ├── src/preload/             # 预加载脚本
│       ├── src/__tests__/           # 应用层测试
│       ├── resources/renderer/      # 内置渲染资源
│       ├── scripts/                 # 应用构建脚本
│       ├── kiosk.config.json        # 开发 / 打包默认配置
│       └── electron-builder.yml
├── packages/
│   ├── core/                        # 窗口、协议、生命周期
│   ├── device/                      # 设备 UUID、硬件信息、配置文件读写
│   ├── ipc/                         # IPC handlers、preload API
│   ├── logger/                      # 文件日志、远程上报、上传队列
│   ├── platform/                    # Windows / macOS 平台适配
│   ├── plugin-rime/                 # RIME 输入法插件
│   ├── plugin-rime-renderer/        # 虚拟键盘渲染层
│   ├── recovery/                    # 崩溃恢复、白屏检测
│   ├── security/                    # Kiosk 模式、快捷键控制
│   ├── shared/                      # 共享类型与配置模型
│   ├── updater/                     # Shell 更新与业务热更新
│   └── watchdog/                    # Windows 看门狗
├── scripts/                         # 根级开发、构建、发布脚本
├── docs/tasks/                      # 任务与审核文档
└── docs/milestone/                  # 里程碑记录
```

## 模块说明

| 模块 | 作用 |
| --- | --- |
| `@kiosk/core` | `BrowserWindow` 管理、协议注册、资源加载、生命周期封装 |
| `@kiosk/device` | 设备 UUID 管理、硬件信息采集、`kiosk.config.json` 读写 |
| `@kiosk/ipc` | IPC channel 定义、主进程 handler 注册、preload 暴露 |
| `@kiosk/logger` | 统一 logger、文件落盘、远程日志上报、失败重试队列 |
| `@kiosk/platform` | Windows / macOS 系统能力差异适配 |
| `@kiosk/plugin-rime` | RIME 输入法核心能力 |
| `@kiosk/plugin-rime-renderer` | 候选词面板与虚拟键盘 UI |
| `@kiosk/recovery` | 崩溃监控、白屏检测、自动重试 |
| `@kiosk/security` | Kiosk 模式与快捷键控制 |
| `@kiosk/shared` | `AppConfig`、Shell API、共享类型 |
| `@kiosk/updater` | 壳更新、业务资源更新、回滚 |
| `@kiosk/watchdog` | Windows 进程保活 |

## 环境要求

- Node.js `>= 18`
- pnpm `>= 8`

安装依赖：

```bash
pnpm install
```

## 常用命令

根目录命令：

```bash
pnpm dev
pnpm build
pnpm build:app
pnpm build:win
pnpm build:mac
pnpm build:all
pnpm test
pnpm clean
pnpm release
pnpm release:patch
pnpm release:minor
pnpm release:major
```

`apps/kiosk` 下常用命令：

```bash
pnpm --filter @kiosk/app dev
pnpm --filter @kiosk/app build
pnpm --filter @kiosk/app test
pnpm --filter @kiosk/app pack
pnpm --filter @kiosk/app dist
```

按包单独执行：

```bash
pnpm --filter @kiosk/logger test
pnpm --filter @kiosk/ipc build
pnpm --filter @kiosk/device test
```

## 配置文件

应用配置文件位于 [`apps/kiosk/kiosk.config.json`](./apps/kiosk/kiosk.config.json)。

当前示例：

```json
{
  "kioskMode": true,
  "devMode": true,
  "crashMonitoring": true,
  "blankDetection": true,
  "contentUrl": "https://www.google.com",
  "width": 1080,
  "height": 1920,
  "whitelist": [],
  "deviceNo": "KSK-001",
  "logger": {
    "serverUrl": "",
    "minLevel": "warn"
  },
  "adminPassword": "12345678",
  "virtualKeyboard": {
    "defaultSchema": "luna_pinyin",
    "candidatePageSize": 9,
    "hideDelayMs": 160,
    "showEmoji": false,
    "simplified": true
  }
}
```

主要字段：

| 字段 | 说明 |
| --- | --- |
| `kioskMode` | 是否启用全屏 kiosk 模式 |
| `devMode` | 是否允许打开开发者工具 |
| `crashMonitoring` | 是否启用崩溃监控 |
| `blankDetection` | 是否启用白屏检测 |
| `contentUrl` | 启动时加载的页面地址，可为 `kiosk://`、`file://`、`http(s)://` |
| `whitelist` | 额外 CSP 白名单域名 |
| `deviceNo` | 设备编号 |
| `adminPassword` | 运维面板密码 |
| `logger.serverUrl` | 远程日志上报接口 |
| `logger.minLevel` | 远程上报最小级别，支持 `error` / `warn` / `info` / `debug` |
| `virtualKeyboard` | RIME 虚拟键盘配置 |

配置加载规则：

- 开发环境读取 `apps/kiosk/kiosk.config.json`。
- 生产环境会把打包内置配置同步到 `userData` 目录，再从 `userData` 读取。
- 缺失字段会和 `@kiosk/shared` 中的默认配置合并。

## 日志

日志模块位于 `@kiosk/logger`，包含两条链路：

- 文件日志：默认启用，负责本地落盘。
- 远程日志：默认允许，但只有配置了 `logger.serverUrl` 才会实际发送。

远程日志默认上报阈值是 `warn`，也就是默认只会上报 `warn` 和 `error`。如果需要放开到 `info` 或 `debug`，修改 `kiosk.config.json` 中的 `logger.minLevel` 即可。

## IPC 与 Preload

当前 IPC 处理器已经按领域拆分：

- `handlers/admin`
- `handlers/debug`
- `handlers/device`
- `handlers/ime`
- `handlers/system`

Preload 负责通过 `contextBridge` 向渲染侧暴露安全 API，不直接开放 Node.js 能力。

## 测试

大多数包都内置了 `vitest`：

```bash
pnpm test
```

如果只验证单个模块：

```bash
pnpm --filter @kiosk/logger test
pnpm --filter @kiosk/ipc test
pnpm --filter @kiosk/device test
```

## 构建与发布

- `pnpm build` 会递归构建所有 workspace。
- `pnpm build:app` 用于构建应用入口。
- `pnpm build:win` / `pnpm build:mac` 用于平台打包。
- `pnpm release:*` 通过根目录脚本执行版本发布流程。

修复构建或配置问题后，建议至少执行一次：

```bash
pnpm build
```

## 开发约束

- 业务逻辑不要进入这个壳仓库。
- 所有系统操作都应该记录日志。
- IPC 必须通过 preload 暴露。
- 更新地址、日志上报地址等外部依赖必须走配置文件，不要硬编码。
- 新功能要补单元测试。
