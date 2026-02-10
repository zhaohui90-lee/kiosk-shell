# 里程碑: 修复 build:mac / build:win 构建失败

**日期**: 2026-02-05
**类型**: Bug Fix
**关联 Issue**: docs/issues/2026-02-05-issue.md - "build脚本测试失败"

## 问题描述

`pnpm build:mac` 和 `pnpm build:win` 构建失败，无法生成可分发的安装包。

## 根因分析

构建失败由 4 个独立问题叠加导致：

### 1. 缺少应用图标文件

`electron-builder.yml` 配置引用了 `build/icon.ico` 和 `build/icon.icns`，但 `apps/kiosk/build/` 目录下只有 SVG 源文件。

### 2. NSIS 配置属性无效

`nsis.installDirectory` 不是 electron-builder v24.13.3 的合法属性，导致配置校验失败。

### 3. 更新服务器 URL 宏未定义

`publish.url` 使用了 `${UPDATE_SERVER_URL}`，这是 electron-builder 内部宏语法而非环境变量语法 `${env.UPDATE_SERVER_URL}`，且环境变量也未设置。

### 4. macOS 代码签名证书已吊销

本地开发环境的代码签名证书已被吊销 (`CSSMERR_TP_CERT_REVOKED`)，开发构建时应跳过签名。

## 修复内容

| 文件 | 修改 |
|------|------|
| `apps/kiosk/build/icon.png` | 新增: 从 SVG 生成 512x512 PNG |
| `apps/kiosk/build/icon.icns` | 新增: 使用 sips + iconutil 生成 macOS 图标 |
| `apps/kiosk/build/icon.ico` | 新增: 使用 Node.js 生成 Windows 多尺寸 ICO |
| `apps/kiosk/electron-builder.yml` | 移除无效的 `nsis.installDirectory` 属性 |
| `apps/kiosk/electron-builder.yml` | 修复 `publish.url` 为 `${env.UPDATE_SERVER_URL}` |
| `scripts/build.ts` | 添加 `UPDATE_SERVER_URL` 默认值（开发构建） |
| `scripts/build.ts` | 添加 `CSC_IDENTITY_AUTO_DISCOVERY=false`（跳过签名） |

## 构建产物验证

- `Kiosk Shell-1.0.0-mac-x64.dmg` - macOS x64
- `Kiosk Shell-1.0.0-mac-arm64.dmg` - macOS ARM64
- `Kiosk Shell-1.0.0-win-x64.exe` - Windows x64 NSIS 安装程序

## 测试结果

所有单元测试通过（662+ 个测试）。
