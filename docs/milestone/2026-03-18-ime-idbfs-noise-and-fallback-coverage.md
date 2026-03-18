# 2026-03-18 IME IDBFS 日志降噪与回退覆盖补充

## 背景

在继续联调 IME 测试页时，发现两个遗留问题：

- Node 环境测试时仍会输出 `[plugin-rime] IDBFS is unavailable, user directory persistence is disabled`，干扰有效日志
- 需要补充测试覆盖，明确当前 IME 测试页已经包含特殊键回退和中文输入下数字选词逻辑

## 本次改动

- 调整 `packages/plugin-rime/src/worker/worker.ts`
  - 在无 `IDBFS` / `indexedDB` 的降级路径中静音提示日志，仅保留内存模式行为
- 更新 `apps/kiosk/src/__tests__/renderer-ime-page.test.ts`
  - 增加对 `committedCursor` 输出光标状态的断言
  - 增加对 `applyUnhandledSpecialKey` 特殊键回退逻辑的断言
  - 增加对中文输入态数字键选词逻辑的断言

## 验证

- `pnpm -C packages/plugin-rime exec node --import tsx --test src/__tests__/*.test.ts` ✅
- `pnpm -C packages/plugin-rime build` ✅
- `pnpm -C apps/kiosk exec vitest run src/__tests__/renderer-ime-page.test.ts` ✅
- `pnpm -C packages/plugin-rime exec node --import tsx -e "const mod = require('./src/worker/worker-api.ts'); ..."` ✅
  - 确认不再输出 `IDBFS is unavailable` 提示
  - 确认 `ni` 后输入 `1` 会提交首个候选
  - 确认 `BackSpace` 会将 `ni` 回退为 `n`

## 结果

- IME Node 测试日志更干净
- IME 测试页当前的特殊键回退与数字选词行为已有明确测试覆盖
