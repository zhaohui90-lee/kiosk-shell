# 2026-03-18 虚拟键盘 preload bundle 修复

## 背景

虚拟键盘插件代码已经接入 `@kiosk/ipc/preload`，但实际 Electron 页面测试时仍然完全不显示。排查后确认不是焦点事件问题，而是 `apps/kiosk` 最终使用的 `dist/preload/index.js` 没有包含虚拟键盘实现。

## 根因

- `apps/kiosk/scripts/bundle-preload.js` 以 `dist/preload/*.js` 作为 esbuild 入口
- 该入口文件会被上一次 bundle 结果覆盖，后续构建容易继续消费旧 bundle
- workspace 解析依赖 `apps/kiosk/node_modules/@kiosk/*`，无法稳定覆盖 `@kiosk/ipc` 的传递依赖导入
- `apps/kiosk build/dev` 未保证先构建 `packages/plugin-rime` 与 `packages/ipc`

## 本次变更

- 修改 `apps/kiosk/scripts/bundle-preload.js`
- 直接从 `apps/kiosk/src/preload/index.ts` / `admin.ts` 作为 bundle 入口
- 将 `@kiosk/*` 解析改为直接指向 monorepo `packages/<name>` 根目录
- 修改 `apps/kiosk/package.json`
- 在 `build` / `dev` 前增加 `build:preload-deps`，顺序构建 `plugin-rime` 和 `ipc`

## 验证

- `pnpm -C apps/kiosk build` ✅
- 确认 `apps/kiosk/dist/preload/index.js` 已包含：
  - `installVirtualKeyboardPlugin`
  - `__kiosk_virtual_keyboard_root`
  - `[Preload] IME virtual keyboard installed`

## 结果

Electron 主窗口实际加载的 preload 产物已包含虚拟键盘插件代码，后续页面点击输入框即可进入真实联调阶段，而不再受旧 preload bundle 影响。
