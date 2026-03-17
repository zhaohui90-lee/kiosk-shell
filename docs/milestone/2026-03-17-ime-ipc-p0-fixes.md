# 2026-03-17 IME IPC P0 修复

## 背景

在 `plugin-rime` 基线接入后，存在 P0 级阻断：

- `@kiosk/plugin-rime` worker 运行时依赖 `Module/IDBFS` 方式不安全，存在直接崩溃风险
- `plugin-rime` strict 编译不通过
- IPC 尚未完整暴露 IME 能力通道

## 本次改动

- 修复 `packages/plugin-rime/src/worker/worker.ts` 的运行时模块获取与严格类型问题
- 改进 `packages/plugin-rime/src/core/rime-kit.ts` 的基础结果分析逻辑，移除调试遗留
- 在 `packages/plugin-rime/src/index.ts` 导出 `RimeKit`
- 在 `packages/ipc/src/types.ts` 增加 IME IPC 通道与类型
- 在 `packages/ipc/src/preload.ts` 暴露 IME API
- 新增 `packages/ipc/src/handlers/ime/index.ts` 并接入 `registerAllHandlers`
- 新增单元测试 `packages/ipc/src/__tests__/ime-handlers.test.ts`

## 验证

- `pnpm -C packages/shared build` ✅
- `pnpm -C packages/plugin-rime build` ✅
- `pnpm -C packages/ipc build` ✅
- `pnpm -C packages/ipc exec vitest run src/__tests__/ime-handlers.test.ts` ✅

## 后续

- 下一步将修复 `packages/ipc` 既有 preload 测试在非 DOM 环境下失败的问题，并补充 IME preload 方法覆盖。
