# 里程碑：虚拟键盘配置抽取 + 移动端键盘布局优化

**日期**: 2026-03-18

## 完成内容

### 1. 虚拟键盘配置抽取到 kiosk.config.json

将虚拟键盘的硬编码配置移至 `apps/kiosk/kiosk.config.json`，通过 IPC 传递给渲染进程。

**变更文件**:
- `packages/shared/app-config.ts` — 新增 `VirtualKeyboardConfig` 接口和 `AppConfig.virtualKeyboard` 字段
- `packages/ipc/src/types.ts` — 新增 `IPC_CHANNELS.IME_GET_CONFIG` 通道和 `ImeConfig` 类型；`ShellAPI` 新增 `imeGetConfig()` 方法
- `packages/ipc/src/handlers/ime/index.ts` — 新增 `setImeConfig()` setter 和 `handleImeGetConfig` handler
- `packages/ipc/src/handlers/index.ts` — 导出新 handler
- `packages/ipc/src/index.ts` — 导出 `setImeConfig` 和 `ImeConfig`
- `packages/ipc/src/preload.ts` — 异步加载虚拟键盘配置（via IPC）再初始化虚拟键盘
- `apps/kiosk/src/main/index.ts` — 启动时将配置传递给 IPC handler
- `apps/kiosk/kiosk.config.json` — 新增 `virtualKeyboard` 配置节

**可配置项**:
```json
"virtualKeyboard": {
  "defaultSchema": "luna_pinyin",
  "candidatePageSize": 5,
  "hideDelayMs": 160
}
```

### 2. 键盘布局优化（参考手机主流键盘）

将虚拟键盘布局从8按键底行改为参考 iOS/Android 中文键盘的标准布局。

**Alpha 模式（中文/英文）4行**:
- 行1: q w e r t y u i o p
- 行2: a s d f g h j k l
- 行3: ⇧(wide) + z x c v b n m + ⌫(wide)
- 行4(中文): 英文 | 123 | ， | 空格(grow) | 。 | 完成(accent/wide)
- 行4(英文): 中文 | 123 | , | 空格(grow) | . | 完成(accent/wide)

**数字模式 4行**（标准手机数字键盘）:
- 行1-3: 3x3 数字键
- 行4: 中文 | . | 0 | - | ⌫(wide)

**其他优化**:
- Shift 按键使用 ⇧/⇪ 符号，激活时显示 `accent` 样式
- 按键高度从 48px 提升至 56px（更易于触控）
- 底行简化（从8项减为6项），去除多余的 `收起` 按钮

**变更文件**:
- `packages/plugin-rime/src/renderer/model.ts` — 重构 `buildKeyboardRows()`
- `packages/plugin-rime/src/renderer/index.ts` — 优化 CSS（按键高度、阴影、颜色）
- `apps/kiosk/resources/renderer/rime-index.html` — 测试页面键盘布局对齐、新增 Shift 状态、config 读取

## 测试

- `packages/plugin-rime/src/__tests__/virtual-keyboard-model.test.ts` — 更新以匹配新布局，6 tests 全部通过
- `packages/ipc/src/__tests__/preload.test.ts` — 更新以适配异步初始化，9 tests 全部通过
