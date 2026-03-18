# Milestone: plugin-rime-renderer 独立包拆分

**日期**: 2026-03-18
**分支**: feat-admin-panel

## 目标

将虚拟键盘 UI 从 `@kiosk/plugin-rime` 中拆出为独立 package `@kiosk/plugin-rime-renderer`，实现 IME engine 与 UI 的职责分离。

## 完成内容

### 新建 packages/plugin-rime-renderer

- `package.json`: `@kiosk/plugin-rime-renderer`，依赖 `@kiosk/shared`
- `tsconfig.json`: 继承 tsconfig.base.json，启用 DOM lib
- `vitest.config.ts`: 与 ipc 包一致的 vitest 配置
- `src/core/keyboard-model.ts`: 从 plugin-rime/src/renderer/model.ts 迁移的纯逻辑（类型、键盘布局、文本操作）
- `src/install.ts`: 从 plugin-rime/src/renderer/index.ts 迁移的 VirtualKeyboardController 和 installVirtualKeyboardPlugin
- `src/index.ts`: 对外导出 installVirtualKeyboardPlugin、VirtualKeyboardOptions、VirtualKeyboardHandle、KeyboardMode
- `src/__tests__/keyboard-model.test.ts`: 移植现有单测，改用 vitest（6 tests 全部通过）

### 修改 packages/ipc

- `src/preload.ts`: 导入路径从 `@kiosk/plugin-rime/renderer` 改为 `@kiosk/plugin-rime-renderer`
- `package.json`: 新增 `@kiosk/plugin-rime-renderer: workspace:*` 依赖
- `src/__tests__/preload.test.ts`: mock 路径同步更新
- 删除 `src/plugin-rime-renderer.d.ts`（旧手动环境声明，已被新包真实导出替代）

### 修改 packages/plugin-rime

- `src/index.ts`: 移除 `./renderer` 相关导出（installVirtualKeyboardPlugin、VirtualKeyboardHandle、VirtualKeyboardOptions、KeyboardMode）
- `package.json`: 移除 `./renderer` subpath export

### 修改 tsconfig.base.json

- 移除旧路径别名 `@kiosk/plugin-rime/renderer`
- 新增路径别名 `@kiosk/plugin-rime-renderer → packages/plugin-rime-renderer/src/index.ts`

### 修改 apps/kiosk/package.json

- `build:preload-deps` 增加 `pnpm -C ../../packages/plugin-rime-renderer build` 步骤

## 验证结果

- `@kiosk/plugin-rime-renderer` 构建通过（tsc 零错误）
- `@kiosk/plugin-rime` 构建通过
- `@kiosk/ipc` 构建通过
- `plugin-rime-renderer` 测试：6/6 通过
- `ipc` 新 preload 测试：9/9 通过（preload.test.ts 全部）
- 预加载 bundle 解析路径验证通过（bundle-preload.js 能正确找到 dist/index.js）
