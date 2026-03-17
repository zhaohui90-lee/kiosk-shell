# 2026-03-17 preload DOM 防护与 IME preload 测试补齐

## 背景

上一轮 IME IPC 接入后，`preload` 在非 DOM 测试环境存在 `document is not defined` 风险，且新增 IME preload API 缺少对应单测覆盖。

## 本次改动

- 在 `packages/ipc/src/preload.ts` 中为 click-zone 注入增加 DOM 环境守卫：
  - 无 `document` 时直接跳过注入
  - `document.body` 不存在时不执行 append
- 在 `packages/ipc/src/__tests__/preload.test.ts` 中补充 IME preload API 断言与调用链测试

## 验证

- `pnpm -C packages/ipc exec vitest run src/__tests__/preload.test.ts` ✅
- `pnpm -C packages/ipc exec vitest run src/__tests__/click-zone.test.ts` ✅
