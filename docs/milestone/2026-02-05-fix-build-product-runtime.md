# 里程碑: 修复构建产物运行异常

**日期**: 2026-02-05
**类型**: Bug Fix
**关联 Issue**: docs/issues/2026-02-05-issue.md - "构建后的产物运行异常"

## 问题描述

构建后的 Windows 平台下：
1. `kiosk.config.json` 配置文件没有出现，依然使用代码内的默认配置
2. 获取 Windows 设备信息数据异常

## 根因分析

### 问题 1: 配置文件未打包

- `kiosk.config.json` 位于 `apps/kiosk/` 根目录
- `electron-builder.yml` 的 `files` 仅包含 `dist/**/*` 和 `resources/**/*`
- 配置文件不在任何包含范围内，未被打包到构建产物中
- 生产环境 `getConfigFilePath()` 指向 `app.getPath('userData')` 但该目录下无此文件
- `ensureConfigFile()` 虽然定义了，但从未在 `main()` 中调用

### 问题 2: 设备信息获取异常

- UUID 获取失败时直接抛出异常，导致整个 `getDeviceInfo` 调用失败
- 应在 UUID 失败时返回 `'N/A'` 而非中断整个设备信息返回

### 附带问题: contentUrl 拼写错误

- `kiosk.config.json` 中 `contentUrl` 值为 `kiosk://render/index.html`（缺少 `r`）
- 正确值应为 `kiosk://renderer/index.html`

## 修复内容

| 文件 | 修改 |
|------|------|
| `apps/kiosk/electron-builder.yml` | 将 `kiosk.config.json` 添加到 `extraResources` |
| `apps/kiosk/src/main/config.ts` | 重构配置路径逻辑：生产环境优先读 userData，回退读 resourcesPath |
| `apps/kiosk/src/main/config.ts` | `saveConfig()` 确保目标目录存在（mkdirSync） |
| `apps/kiosk/src/main/config.ts` | `ensureConfigFile()` 支持将 bundled 配置复制到 userData |
| `apps/kiosk/src/main/index.ts` | 在 `loadConfig()` 前调用 `ensureConfigFile()` |
| `apps/kiosk/kiosk.config.json` | 修复 `contentUrl` 拼写：`render` → `renderer` |
| `packages/ipc/src/handlers/device.ts` | UUID 获取失败时返回 `'N/A'` 而非抛出异常 |

## 新增测试

- `apps/kiosk/src/__tests__/config.test.ts` (15 个测试)
  - 开发模式下配置加载
  - 生产模式下配置路径优先级
  - 无效 JSON 降级到默认值
  - ensureConfigFile 行为
  - CSP 生成
- `packages/ipc/src/__tests__/handlers.test.ts` 新增 1 个测试
  - UUID 获取失败时返回 N/A 而非抛异常

## 测试结果

所有测试通过（682+ 个测试）。
