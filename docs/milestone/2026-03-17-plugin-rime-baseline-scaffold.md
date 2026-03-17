# 2026-03-17 plugin-rime 基线提交

## 背景

为 Electron 输入法插件能力预留基础代码与类型定义，先落库当前工作区草稿，作为后续 P0 修复的基线。

## 本次提交内容

- 新增 `packages/plugin-rime` 包（worker、config、wasm 资源、core 封装草稿）
- 新增 `packages/shared/plugin-rime` 共享类型定义
- 调整 `packages/shared/index.ts` 导出 plugin-rime 类型
- 新增 `packages/ipc/src/handlers/ime/` 目录占位
- 更新 `tsconfig.base.json` 与 `pnpm-lock.yaml`

## 验证说明

- 执行了 `pnpm -C packages/ipc test`
- 当前存在历史失败项与草稿引入失败项，未在本次基线提交中修复

## 下一步

- 执行 P0 修复：先解决 plugin-rime 运行时崩溃点与 strict 编译错误，再补齐 IPC 通道/handler/preload 接线。
