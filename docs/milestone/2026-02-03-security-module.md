# @kiosk/security 模块实现

**日期**: 2026-02-03

## 完成内容

### 3.1 @kiosk/security (P1)

- [x] 实现 types.ts (类型定义)
- [x] 实现 constants.ts (常量定义)
- [x] 实现 shortcuts.ts (快捷键屏蔽)
- [x] 实现 kiosk-mode.ts (Kiosk 模式管理)
- [x] 实现 ipc-guard.ts (IPC 权限校验)
- [x] 编写单元测试 (108 个测试全部通过)

## 模块结构

```
packages/security/
├── src/
│   ├── __tests__/
│   │   ├── types.test.ts        # 类型和常量测试 (14 tests)
│   │   ├── shortcuts.test.ts    # 快捷键屏蔽测试 (30 tests)
│   │   ├── kiosk-mode.test.ts   # Kiosk 模式测试 (33 tests)
│   │   └── ipc-guard.test.ts    # IPC 权限测试 (31 tests)
│   ├── types.ts                 # 类型定义
│   ├── constants.ts             # 常量定义
│   ├── shortcuts.ts             # 快捷键屏蔽
│   ├── kiosk-mode.ts            # Kiosk 模式管理
│   ├── ipc-guard.ts             # IPC 权限校验
│   └── index.ts                 # 模块入口
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 功能清单

### Shortcuts (shortcuts.ts)

| 功能 | 说明 |
|------|------|
| blockShortcuts() | 屏蔽危险快捷键 |
| unblockShortcuts() | 解除快捷键屏蔽 |
| blockSingleShortcut() | 屏蔽单个快捷键 |
| unblockSingleShortcut() | 解除单个快捷键屏蔽 |
| getShortcutsToBlock() | 获取待屏蔽的快捷键列表 |
| getBlockerState() | 获取屏蔽器状态 |
| isShortcutBlocked() | 检查快捷键是否被屏蔽 |
| setShortcutHandler() | 设置快捷键处理器（测试用） |

### Kiosk Mode (kiosk-mode.ts)

| 功能 | 说明 |
|------|------|
| enableKioskMode() | 启用 Kiosk 模式 |
| disableKioskMode() | 禁用 Kiosk 模式（需要密码验证） |
| toggleKioskMode() | 切换 Kiosk 模式 |
| updateKioskConfig() | 更新 Kiosk 配置 |
| getKioskState() | 获取 Kiosk 状态 |
| isKioskModeEnabled() | 检查是否启用 |
| setExitPassword() | 设置退出密码 |
| verifyExitPassword() | 验证退出密码 |
| getKioskModeWindows() | 获取所有 Kiosk 模式窗口 |

### IPC Guard (ipc-guard.ts)

| 功能 | 说明 |
|------|------|
| configureIpcGuard() | 配置 IPC 防护 |
| validateIpcRequest() | 验证 IPC 请求 |
| createGuardedHandler() | 创建受保护的处理器 |
| addAllowedChannel() | 添加白名单通道 |
| removeAllowedChannel() | 移除白名单通道 |
| addAllowedWebContentsId() | 添加允许的 webContents ID |
| removeAllowedWebContentsId() | 移除允许的 webContents ID |
| isChannelAllowed() | 检查通道是否允许 |
| isSourceAllowed() | 检查来源是否允许 |
| setSourceValidation() | 启用/禁用来源验证 |

## 默认屏蔽的快捷键

### Windows
- Alt+F4 (关闭窗口)
- Ctrl+W (关闭标签页)
- Alt+Tab (切换应用)
- F5, Ctrl+R (刷新)
- F12, Ctrl+Shift+I (DevTools)
- F11 (全屏切换)
- Escape (退出全屏)
- 等 21 个快捷键

### macOS
- Cmd+Q (退出应用)
- Cmd+W (关闭窗口)
- Cmd+Tab (切换应用)
- Cmd+R (刷新)
- F12, Cmd+Option+I (DevTools)
- Cmd+Ctrl+F (全屏切换)
- Escape (退出全屏)
- 等 21 个快捷键

## Kiosk 模式功能

| 功能 | 默认值 | 说明 |
|------|--------|------|
| blockShortcuts | true | 屏蔽危险快捷键 |
| fullscreen | true | 全屏模式 |
| alwaysOnTop | true | 始终置顶 |
| disableMenuBar | true | 隐藏菜单栏 |
| allowDevTools | false | 允许 DevTools |
| exitPassword | - | 退出密码 |

## 导出 API

```typescript
// 类型导出
export type {
  Platform,
  Shortcut,
  ShortcutBlockerConfig,
  ShortcutBlockerState,
  ShortcutHandler,
  KioskModeConfig,
  KioskModeState,
  KioskModeResult,
  IpcGuardConfig,
  IpcValidationResult,
}

// 常量
export {
  CURRENT_PLATFORM,
  DEFAULT_BLOCKED_SHORTCUTS,
  DEVTOOLS_SHORTCUTS,
  DEFAULT_IPC_WHITELIST,
  DEFAULT_KIOSK_CONFIG,
  ERROR_MESSAGES,
}

// 快捷键函数
export {
  setShortcutHandler,
  getShortcutsToBlock,
  blockShortcuts,
  unblockShortcuts,
  getBlockerState,
  isShortcutBlocked,
  blockSingleShortcut,
  unblockSingleShortcut,
  resetBlockerStates,
}

// Kiosk 模式函数
export {
  setExitPassword,
  verifyExitPassword,
  getKioskState,
  isKioskModeEnabled,
  enableKioskMode,
  disableKioskMode,
  toggleKioskMode,
  updateKioskConfig,
  resetKioskStates,
  getKioskModeWindows,
}

// IPC 权限函数
export {
  configureIpcGuard,
  getIpcGuardConfig,
  addAllowedChannel,
  removeAllowedChannel,
  addAllowedWebContentsId,
  removeAllowedWebContentsId,
  isChannelAllowed,
  isSourceAllowed,
  validateIpcRequest,
  createGuardedHandler,
  resetIpcGuard,
  setSourceValidation,
  getAllowedChannels,
  getAllowedWebContentsIds,
}
```

## 测试覆盖

| 测试文件 | 测试数量 |
|----------|----------|
| types.test.ts | 14 |
| shortcuts.test.ts | 30 |
| kiosk-mode.test.ts | 33 |
| ipc-guard.test.ts | 31 |
| **总计** | **108** |

## 安全特性

1. **快捷键屏蔽**: 防止用户使用危险快捷键退出应用
2. **Kiosk 模式**: 全屏、置顶、隐藏菜单栏的完整锁定模式
3. **密码保护**: 退出 Kiosk 模式需要密码验证
4. **IPC 白名单**: 只允许预定义的 IPC 通道
5. **来源验证**: 可选的 webContents ID 验证
6. **日志记录**: 所有操作都有日志追踪

## 下一步

继续 Phase 3 - 安全与恢复:

1. 实现 `@kiosk/recovery` 模块 (P1)
   - crash-handler.ts (崩溃处理)
   - blank-detector.ts (白屏检测)
   - auto-retry.ts (自动重试)
