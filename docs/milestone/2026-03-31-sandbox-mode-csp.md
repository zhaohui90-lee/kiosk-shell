# 2026-03-31 sandboxMode CSP 开关

## 功能描述

实现 `sandboxMode` 配置开关对 Content-Security-Policy 的控制：

- `sandboxMode: true`（默认）：严格模式，CSP 仅允许 `'self'`、`kiosk:` 和 `whitelist` 中的域名
- `sandboxMode: false`：开放模式，CSP 使用 `*` 允许任意第三方资源加载

## 修改文件

| 文件 | 变更 |
|------|------|
| `packages/shared/app-config.ts` | 新增 `sandboxMode: boolean` 字段（已在上游提交中完成） |
| `apps/kiosk/src/main/config.ts` | `generateCSP()` 新增 `sandboxMode` 参数，`false` 时返回全开放 CSP |
| `apps/kiosk/src/main/index.ts` | 调用处传入 `config.sandboxMode` |
| `apps/kiosk/src/__tests__/config.test.ts` | 新增 4 个测试用例，修复 1 个受影响的已有测试 |
| `packages/shared/dist/*` | 重新构建 shared 包，dist 中包含 `sandboxMode` |

## 测试结果

25 tests passed (config.test.ts)
