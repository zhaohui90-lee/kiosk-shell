# 2026-03-18 plugin-rime 清理与特殊键输入修复

## 背景

继续审核 `packages/plugin-rime` 时，发现两类问题：

- `RimeKit` 内存在不会生效的初始化分支、硬编码 schema 列表以及未使用依赖，代码和发布面都有冗余
- IME 输入链路只支持普通字符串，`BackSpace`、`Enter`、方向键、分页键等特殊键没有按 Rime 约定编码传入
- Node 运行测试时会持续输出 `warning: unsupported syscall: __syscall_prlimit64`，影响排查有效日志

## 本次改动

- 清理 `packages/plugin-rime/src/core/rime-kit.ts`
  - 删除无效初始化分支与占位方法
  - 移除过时的硬编码 schema 列表
  - schema 显示名与可用列表统一改为从配置读取
- 新增 `packages/plugin-rime/src/core/schema-registry.ts`
  - 抽离 schema 列表和显示名解析逻辑
- 新增 `packages/plugin-rime/src/worker/input-sequence.ts`
  - 将 `BackSpace`、`Enter`、方向键、分页键和修饰键组合转换为 Rime 可识别的 key sequence
- 新增 `packages/plugin-rime/src/worker/runtime-log.ts`
  - 过滤已知无害的 `__syscall_prlimit64` 告警
- 调整 `packages/plugin-rime/src/worker/worker.ts`
  - 在调用 wasm `process` 前统一归一化输入
  - 在 `printErr` 中忽略已知无害告警
- 收紧 `packages/plugin-rime/package.json`
  - 删除未使用的生产依赖
  - 发布文件列表由整份 `src` 收敛为 `src/wasm`
- 更新 `apps/kiosk/resources/renderer/rime-index.html`
  - 增加物理键到 IME 特殊键的映射
  - 对未处理的特殊键保留组合态，不再误清空
- 修正 `apps/kiosk/src/__tests__/renderer-ime-page.test.ts`
  - 改为校验当前真实的 IME 测试页结构与按键映射逻辑
- 新增单元测试
  - `packages/plugin-rime/src/__tests__/schema-registry.test.ts`
  - `packages/plugin-rime/src/__tests__/input-sequence.test.ts`
  - `packages/plugin-rime/src/__tests__/runtime-log.test.ts`

## 验证

- `pnpm -C packages/plugin-rime exec node --import tsx --test src/__tests__/*.test.ts` ✅
- `pnpm -C packages/plugin-rime build` ✅
- `pnpm -C packages/ipc exec vitest run src/__tests__/preload.test.ts src/__tests__/ime-handlers.test.ts` ✅
- `pnpm -C apps/kiosk exec vitest run src/__tests__/renderer-ime-page.test.ts` ✅

## 结果

- `plugin-rime` 代码体积与发布面进一步收缩
- 特殊键现在可以通过统一协议送入 Rime，测试页和物理键盘联调路径可用
- `__syscall_prlimit64` 不再干扰测试日志输出
