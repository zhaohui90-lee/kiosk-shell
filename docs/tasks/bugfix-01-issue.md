# Bug修复任务 - Issue 01

> 来源: docs/issues/01-issue.md
> 创建日期: 2026-02-05
> 分支: bug-fix

---

## 任务列表

### Task 1: 实现开发者模式开关

**优先级**: P1
**状态**: `[x]` 已完成

**问题描述**:
目前没有实现 dev 开发者面板模式，希望在配置文件中新增一个开关，可以控制客户端开发者模式。

**需求分析**:
- 在配置文件中添加 `devMode` 或 `devTools` 开关
- 当开关开启时，允许打开 DevTools
- 开发环境默认开启，生产环境默认关闭

**涉及模块**:
- `apps/kiosk` - 主进程配置

**修复内容**:
- 创建 `apps/kiosk/src/main/config.ts` 配置加载模块
- 创建 `apps/kiosk/kiosk.config.json` 配置文件
- 支持从外部配置文件控制 `devMode` 开关
- 配置文件路径: 开发时在项目根目录，生产时在 userData 目录

**配置文件示例**:
```json
{
  "kioskMode": false,
  "devMode": true,
  "crashMonitoring": true,
  "blankDetection": true,
  "contentUrl": "kiosk://renderer/index.html",
  "width": 1920,
  "height": 1080
}
```

**验收标准**:
- [x] 配置文件中存在 devMode 开关选项
- [x] 开关为 true 时可以打开 DevTools
- [x] 开关为 false 时禁止打开 DevTools
- [x] 单元测试通过 (3 tests)

---

### Task 2: 修复设备信息获取不准确

**优先级**: P0
**状态**: `[x]` 已完成

**问题描述**:
ShellAPI 接口中的 `getDeviceInfo` 方法获取设备信息不准确：
- 本机设备：MacBook Pro M1
- 方法获取的信息：Platform: MacIntel; Device UUID: N/A

**需求分析**:
- Platform 应该识别 Apple Silicon (arm64) 架构
- Device UUID 应该正确获取设备唯一标识

**涉及模块**:
- `@kiosk/device` - hardware-info.ts, uuid-manager.ts
- `@kiosk/ipc` - handlers/device.ts

**修复内容**:
- 将 IPC handler 中的占位 `getDeviceUuid()` 替换为使用 `@kiosk/device` 模块
- 添加 `@kiosk/device` 依赖到 `@kiosk/ipc`
- 更新测试用例以 mock `@kiosk/device` 模块

**验收标准**:
- [x] M1/M2/M3 Mac 识别为正确的架构 (arm64) - Node.js `os.arch()` 正确返回
- [x] Device UUID 能正确获取并返回 - 使用 `@kiosk/device` 模块持久化管理
- [x] 单元测试通过 (47 tests)

**注意**: 如果渲染进程仍显示 `MacIntel`，请检查是否使用了 `navigator.platform` 而非 `shellAPI.getDeviceInfo()`

---

### Task 3: 修复 canvas 元素不渲染

**优先级**: P1
**状态**: `[x]` 已完成

**问题描述**:
测试发现，客户端对 canvas 元素不渲染。

**需求分析**:
- 可能与 Electron webPreferences 配置有关
- 可能与 GPU 加速设置有关
- 需要检查 BrowserWindow 的配置

**涉及模块**:
- `@kiosk/core` - window.ts
- `apps/kiosk` - main/index.ts

**修复内容**:
问题根因：开发模式下 `sandbox: true` 可能导致某些渲染问题。

已在 Task 2 修复过程中解决：
- 开发模式下设置 `sandbox: false`
- 添加 canvas 测试页面验证 2D/WebGL 渲染

**验收标准**:
- [x] canvas 元素能正常渲染
- [x] WebGL 上下文正常工作 (显示 WebGL: OK)
- [x] 2D canvas 上下文正常工作 (显示 2D: OK)
- [x] 测试页面已添加

---

---

### Task 4: 新增白名单功能

**优先级**: P1
**状态**: `[x]` 已完成

**问题描述**:
新增白名单功能，白名单上的第三方资源可以访问。

**需求分析**:
- 在配置文件中添加 `whitelist` 数组
- 白名单中的域名可以被页面访问（加载脚本、样式、图片等）
- 动态生成 Content-Security-Policy 头部

**涉及模块**:
- `apps/kiosk/src/main/config.ts` - 配置加载
- `apps/kiosk/src/main/index.ts` - CSP 头部生成

**修复内容**:
- 在 AppConfig 中添加 `whitelist: string[]` 字段
- 新增 `generateCSP()` 函数动态生成 CSP 策略
- CSP 策略自动包含白名单域名
- 支持 default-src、script-src、style-src、img-src、font-src、connect-src、media-src、frame-src

**配置示例**:
```json
{
  "whitelist": [
    "http://localhost:8081",
    "https://cdn.jsdelivr.net",
    "https://unpkg.com"
  ]
}
```

**验收标准**:
- [x] 配置文件中可以添加白名单域名
- [x] 白名单域名的资源可以正常加载
- [x] 非白名单域名被 CSP 阻止
- [x] 单元测试通过 (3 tests)

---

## 执行顺序建议

1. **Task 2** (P0) - 设备信息问题可能影响其他功能 ✅
2. **Task 1** (P1) - 开发者模式便于调试后续问题 ✅
3. **Task 3** (P1) - canvas 渲染问题 ✅
4. **Task 4** (P1) - 白名单功能

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-02-05 | 创建任务文档 |
