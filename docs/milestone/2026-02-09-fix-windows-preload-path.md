# 修复 Windows 打包后 preload.js 模块解析失败

**日期**: 2026-02-09

## 问题描述

Windows 平台打包后运行时，preload 脚本加载失败：

```
Unable to load preload script: C:\Program Files\Kiosk Shell\resources\app.asar\dist\preload\index.js
Error: module not found: @kiosk/ipc/preload
```

## 根因分析

1. **Electron sandbox 限制**: Sandbox 模式下，preload 脚本的 `require()` 只支持 `require('electron')`，不能解析 workspace 包（如 `@kiosk/ipc/preload`）
2. **不必要的 re-export**: preload 入口文件中 `export { shellAPI, exposeShellAPI } from '@kiosk/ipc'` 会拉入 `@kiosk/ipc/index`，其中包含 `handlers`（使用 `ipcMain`），在 preload 上下文中不可用
3. **路径解析问题（前次修复）**: 已在前次修复中通过 `app.getAppPath()` 和 `asarUnpack` 解决

## 修复方案

### 1. 简化 preload 源码 (`apps/kiosk/src/preload/index.ts`)

移除 `export { shellAPI, exposeShellAPI } from '@kiosk/ipc'`，只保留 `import '@kiosk/ipc/preload'`。preload 脚本的职责仅是执行 `contextBridge.exposeInMainWorld()`，不需要对外 re-export。

### 2. 使用 esbuild 打包 preload (`apps/kiosk/scripts/bundle-preload.js`)

创建 esbuild 构建脚本，将 tsc 编译后的 `dist/preload/index.js` 及其所有依赖打包成一个自包含文件：

- `@kiosk/ipc/preload` → `types.js` + `constants.js` → 全部内联
- `electron` → 保持 external（sandbox 环境提供）
- 使用自定义插件解析 `@kiosk/*` workspace 包，通过读取 `package.json` 的 `exports` 字段

### 3. 更新构建脚本 (`apps/kiosk/package.json`)

```
"build": "tsc && node scripts/bundle-preload.js"
```

## 修改文件清单

| 文件 | 变更 |
|------|------|
| `apps/kiosk/src/preload/index.ts` | 移除 re-export，只保留 import |
| `apps/kiosk/package.json` | 添加 esbuild devDependency，更新 build 脚本 |
| `apps/kiosk/scripts/bundle-preload.js` | 新增 esbuild 打包脚本 |

## 打包后依赖链

```
apps/kiosk/dist/preload/index.js (bundled, 自包含)
  └── @kiosk/ipc/dist/preload.js (已内联)
       ├── electron (external, sandbox 提供)
       ├── ./types.js (已内联, IPC_CHANNELS 常量)
       └── ./constants.js (已内联, SHELL_API_NAMESPACE 等)
```

## 验证

- TypeScript 编译通过
- esbuild 打包成功，产出自包含文件
- 打包后仅有 `require("electron")` 一个外部依赖
- 所有单元测试通过
