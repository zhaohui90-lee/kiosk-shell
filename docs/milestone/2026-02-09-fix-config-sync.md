# Fix: 配置文件覆盖逻辑修正 — resources 为主配置

**日期**: 2026-02-09
**类型**: Bug Fix
**分支**: bug-fix

## 问题描述

配置合并逻辑中 userData 优先于 resources，但运维逻辑要求 `resources/kiosk.config.json` 是主配置（运维人员部署时配置），`userData/kiosk.config.json` 应被覆盖同步。

**根因**: 旧逻辑将 userData 视为用户自定义配置（优先级高于 bundled config），但实际上 `saveConfig()` 仅在启动阶段调用、`loadConfig()` 仅启动时调用一次、无 IPC handler 运行时修改配置，因此 userData 不会产生"用户自定义"数据，合并逻辑多余。

## 修复内容

### 核心逻辑变更

```
旧逻辑: userConfig (userData) > bundledConfig (resources) > DEFAULT_CONFIG
新逻辑: bundledConfig (resources) 直接覆盖 → userData（userData 仅作为工作副本）
```

### 修改文件

| 文件 | 变更 |
|------|------|
| `apps/kiosk/src/main/config.ts` | 简化 `ensureProdConfig()` 为 resources 直接覆盖 userData；使用 `copyFileSync` 替代合并逻辑；删除 `loadBundledConfig()`、`loadRawConfig()`、`mergeConfig()`；简化 `updateConfigFile()` 为 dev-only 的 `updateDevConfigFile()`；清理调试日志；简化 `getConfigFilePath()` 生产模式路径 |
| `apps/kiosk/src/__tests__/config.test.ts` | 重写配置同步测试：resources 始终覆盖 userData、resources 不存在保持 userData、两者都不存在创建 DEFAULT_CONFIG；删除旧的 "user values take priority" 测试 |

### 简化后的 `ensureProdConfig()` 逻辑

```
resources/kiosk.config.json 存在 → copyFileSync 到 userData（覆盖）
resources 不存在 + userData 不存在 → 从 DEFAULT_CONFIG 创建
resources 不存在 + userData 存在 → 保持不变
```

### 代码简化

- 删除 `loadBundledConfig()` — 不再需要读取+合并，直接复制
- 删除 `loadRawConfig()` — 不再需要区分用户字段和默认字段
- 删除 `mergeConfig()` — 不再需要递归合并
- 删除 `createInitialConfig()` — 逻辑合并到 `ensureProdConfig()`
- `updateConfigFile()` 重命名为 `updateDevConfigFile()`，仅供 dev 模式使用

## 测试验证

- 全部 21 个 app 测试通过 (含 18 个 config 测试)
- 全部 monorepo 测试通过
- TypeScript 构建通过
