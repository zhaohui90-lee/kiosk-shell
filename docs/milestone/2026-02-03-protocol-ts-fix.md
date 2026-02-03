# @kiosk/core protocol.ts TypeScript 修复

**日期**: 2026-02-03

## 问题描述

`packages/core/src/protocol.ts` 编译时出现 TypeScript 错误：

```
src/protocol.ts(137,7): error TS2741: Property 'bytes' is missing in type
src/protocol.ts(151,7): error TS2741: Property 'bytes' is missing in type
```

## 原因分析

Electron 40.1.0 的 `protocol.handle()` 方法期望返回 `Response` 类型，但存在类型冲突：

1. Node.js 18+ 的 `undici-types` 提供了 `Response` 类型
2. Electron 期望的 `Response` 类型包含 `bytes` 方法
3. `undici-types/fetch` 的 `Response` 缺少 `bytes` 属性

## 解决方案

在 `handleRequest` 方法中，对 `new Response()` 的返回值添加类型断言 `as Response`，使 TypeScript 接受返回类型。

```typescript
return new Response(response.data, {
  status: response.statusCode ?? 200,
  headers: {
    'Content-Type': response.mimeType,
    'Content-Length': String(response.data.length),
  },
}) as Response;
```

## 验证结果

- [x] `pnpm build` 全部成功（11 个包）
- [x] `@kiosk/core` 单元测试全部通过（78 个测试）

## 文件变更

- `packages/core/src/protocol.ts` - 第 137 行和第 151 行添加类型断言
