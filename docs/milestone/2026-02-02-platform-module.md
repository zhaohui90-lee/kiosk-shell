# @kiosk/platform 模块实现

**日期**: 2026-02-02

## 完成内容

### 2.2 @kiosk/platform (P0)

- [x] 定义平台适配器接口 (`types.ts`, `adapter.ts`)
- [x] 实现 Windows 平台适配器 (`windows/index.ts`)
- [x] 实现 macOS 平台适配器 (`darwin/index.ts`)
- [x] 编写单元测试 (35 个测试全部通过)

## 模块结构

```
packages/platform/
├── src/
│   ├── __tests__/
│   │   ├── adapter.test.ts    # 适配器工厂测试
│   │   ├── windows.test.ts    # Windows 适配器测试
│   │   └── darwin.test.ts     # macOS 适配器测试
│   ├── windows/
│   │   └── index.ts           # Windows 平台实现
│   ├── darwin/
│   │   └── index.ts           # macOS 平台实现
│   ├── adapter.ts             # 平台适配器工厂
│   ├── types.ts               # 类型定义
│   └── index.ts               # 模块入口
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 功能清单

| 功能 | Windows | macOS |
|------|---------|-------|
| 系统信息获取 | ✅ | ✅ |
| 关机/重启 | ✅ (shutdown) | ✅ (osascript) |
| 快捷键屏蔽配置 | ✅ | ✅ |
| Kiosk 模式管理 | ✅ | ✅ |
| 外部 URL 打开 | ✅ (start) | ✅ (open) |
| 应用数据路径 | ✅ (%APPDATA%) | ✅ (~/Library/Application Support) |

## 导出 API

```typescript
// 类型导出
export type { Platform, PlatformAdapter, SystemInfo, ShutdownOptions, RestartOptions, ShortcutConfig }

// 工厂函数
export { detectPlatform, createPlatformAdapter, getPlatformAdapter, resetPlatformAdapter }

// 平台实现类
export { WindowsAdapter, DarwinAdapter }
```

## 测试覆盖

- 适配器工厂测试: 7 个
- Windows 适配器测试: 14 个
- macOS 适配器测试: 14 个
- **总计: 35 个测试**

## 下一步

继续 Phase 2 剩余任务:

1. 实现 `@kiosk/core` (P0)
2. 实现 `@kiosk/ipc` (P1)
