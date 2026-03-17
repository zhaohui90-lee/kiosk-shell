# 2026-03-17 IME Worker 运行时兼容与测试页补强

## 背景

在 Electron 客户端联调 IME IPC 时，主进程调用 `@kiosk/plugin-rime` 出现运行时错误：

- `Worker is not defined`
- 后续在 Node 环境下还存在 `indexedDB` / `IDBFS` 兼容与 wasm 资源路径问题

同时，为了持续验证 IME 接口，补充了 renderer 侧测试页相关测试覆盖。

## 本次改动

- 在 `packages/plugin-rime/src/worker/worker-api.ts` 增加主进程运行时适配入口
- 新增 `packages/plugin-rime/src/worker/node-worker-runtime.ts`
  - 基于 `worker_threads` 提供 Web Worker 形态的 shim
  - 处理脚本路径解析与启动错误回传
- 新增 `packages/plugin-rime/src/worker/node-worker-bootstrap.ts`
  - 在 Node worker 内补齐 `self/onmessage/postMessage/importScripts`
  - 支持全局脚本执行上下文兼容 `rime.js`
- 调整 `packages/plugin-rime/src/worker/worker.ts`
  - Node 下 wasm 与预置词库走本地资源路径
  - 无 `indexedDB` 时禁用 `IDBFS` 持久化并降级内存模式
  - 修复日志输出分支边界
- 新增单元测试 `packages/plugin-rime/src/__tests__/node-worker-runtime.test.ts`
- 补充 IME 运行时 fallback 测试 `packages/ipc/src/__tests__/ime-runtime-fallback.test.ts`
- 补充 renderer IME 测试页测试 `apps/kiosk/src/__tests__/renderer-ime-page.test.ts`

## 验证

- `pnpm -C packages/plugin-rime exec node --import tsx --test src/__tests__/node-worker-runtime.test.ts` ✅
- `pnpm -C packages/plugin-rime build` ✅
- `pnpm -C packages/ipc exec vitest run src/__tests__/ime-handlers.test.ts src/__tests__/ime-runtime-fallback.test.ts` ✅
- `pnpm -C packages/ipc build` ✅
- `pnpm -C apps/kiosk exec vitest run src/__tests__/renderer-ime-page.test.ts` ✅

## 结果

主进程路径下不再因 `Worker is not defined` 直接失败，IME 调用链可继续执行并返回结果，便于后续在客户端进行真实输入法联调。
