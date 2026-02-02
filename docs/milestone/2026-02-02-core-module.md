# @kiosk/core 模块实现

**日期**: 2026-02-02

## 完成内容

### 2.3 @kiosk/core (P0)

- [x] 实现 window.ts (窗口管理)
- [x] 实现 loader.ts (资源加载)
- [x] 实现 protocol.ts (kiosk:// 协议)
- [x] 实现 lifecycle.ts (生命周期)
- [x] 编写单元测试 (78 个测试全部通过)

## 模块结构

```
packages/core/
├── src/
│   ├── __tests__/
│   │   ├── types.test.ts       # 类型定义测试
│   │   ├── window.test.ts      # 窗口管理测试
│   │   ├── loader.test.ts      # 资源加载测试
│   │   ├── protocol.test.ts    # 协议处理测试
│   │   └── lifecycle.test.ts   # 生命周期测试
│   ├── types.ts                # 类型定义
│   ├── window.ts               # 窗口管理
│   ├── loader.ts               # 资源加载
│   ├── protocol.ts             # kiosk:// 协议
│   ├── lifecycle.ts            # 生命周期管理
│   └── index.ts                # 模块入口
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 功能清单

### WindowManager (window.ts)

| 功能 | 说明 |
|------|------|
| createWindow() | 创建 BrowserWindow |
| loadURL() / loadFile() | 加载内容 |
| enterFullscreen() / exitFullscreen() | 全屏控制 |
| enterKioskMode() / exitKioskMode() | Kiosk 模式控制 |
| openDevTools() / closeDevTools() | DevTools 控制 |
| reload() / forceReload() | 页面刷新 |

### ResourceLoader (loader.ts)

| 功能 | 说明 |
|------|------|
| initialize() | 初始化资源加载器 |
| getEntryURL() | 获取入口 URL |
| getResourcePath() | 获取资源目录路径 |
| getActiveSlot() / getInactiveSlot() | A/B 槽位管理 |
| switchSlot() | 切换槽位 |
| verifySlot() | 校验槽位完整性 |

### ProtocolHandler (protocol.ts)

| 功能 | 说明 |
|------|------|
| registerPrivileged() | 注册为特权协议 |
| register() | 注册协议处理器 |
| handleRequest() | 处理 kiosk:// 请求 |
| getMimeType() | 获取 MIME 类型 |
| 路径安全校验 | 防止路径遍历攻击 |

### LifecycleManager (lifecycle.ts)

| 功能 | 说明 |
|------|------|
| initialize() | 初始化生命周期管理 |
| requestSingleInstanceLock() | 单实例锁定 |
| on() / off() | 事件监听 |
| whenReady() | 等待 app ready |
| quit() / exit() / relaunch() | 应用退出/重启 |
| setLoginItemSettings() | 自启动设置 |

## 导出 API

```typescript
// 类型导出
export type {
  WindowConfig,
  LoaderConfig,
  SlotId,
  SlotInfo,
  ProtocolResponse,
  LifecycleEvent,
  LifecycleHandler,
  AppState,
}

// 窗口管理
export { WindowManager, getWindowManager, resetWindowManager, createWindowManager }

// 资源加载
export { ResourceLoader, getResourceLoader, resetResourceLoader, createResourceLoader }

// 协议处理
export { KIOSK_PROTOCOL, ProtocolHandler, getProtocolHandler, resetProtocolHandler, createProtocolHandler }

// 生命周期
export { LifecycleManager, getLifecycleManager, resetLifecycleManager, createLifecycleManager }
```

## 测试覆盖

- 类型定义测试: 10 个
- 窗口管理测试: 27 个
- 资源加载测试: 14 个
- 协议处理测试: 13 个
- 生命周期测试: 14 个
- **总计: 78 个测试**

## 安全特性

1. **禁用 nodeIntegration**: 渲染进程无法直接访问 Node.js
2. **启用 contextIsolation**: 预加载脚本与渲染进程隔离
3. **启用 sandbox**: 渲染进程沙箱化
4. **路径遍历防护**: protocol.ts 中校验请求路径
5. **阻止新窗口**: setWindowOpenHandler 拒绝所有新窗口请求

## 下一步

继续 Phase 2 剩余任务:

1. 实现 `@kiosk/ipc` (P1)
