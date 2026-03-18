# 2026-03-18 虚拟键盘插件接入

## 背景

`apps/kiosk/resources/renderer/rime-index.html` 已有 Rime 输入法测试页，但能力只存在于单页脚本中，无法复用到 Electron 加载的业务页面。目标是把这部分能力拆到 `packages` 下，作为客户端自动注入的虚拟键盘插件。

## 本次变更

- 在 `packages/plugin-rime/src/renderer/` 新增虚拟键盘 renderer 插件
- 支持 `input` / `textarea` 聚焦后自动显示、失焦或点击隐藏按钮后自动收起
- 支持中文拼音输入、候选词点击提交、英文大小写输入、数字键盘
- 在 `packages/ipc/src/preload.ts` 中自动安装插件，让业务页面无需额外接线即可使用
- 新增 `packages/plugin-rime/src/__tests__/virtual-keyboard-model.test.ts`
- 更新 `packages/ipc/src/__tests__/preload.test.ts` 覆盖插件自动安装

## 验证

- `pnpm -C packages/plugin-rime exec node --import tsx --test src/__tests__/virtual-keyboard-model.test.ts src/__tests__/input-sequence.test.ts` ✅
- `pnpm -C packages/plugin-rime build` ✅
- `pnpm -C packages/ipc exec vitest run src/__tests__/preload.test.ts` ✅
- `pnpm -C packages/ipc build` ✅
- `pnpm -C apps/kiosk build` ✅

## 结果

Electron 客户端现在具备可复用的底部滑出式虚拟键盘能力，业务页面中的标准文本输入控件无需改造即可调用 Rime 中文输入和英文/数字输入。
