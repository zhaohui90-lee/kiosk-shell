# Milestone: plugin-rime-renderer 合并样式 + 浅色主题重设计

**日期**: 2026-03-18
**分支**: feat-admin-panel
**Commit**: b9c3d96

## 目标

将 `keyboard-styles.ts` 合并进 `VirtualKeyboardApp.vue`，消除单独样式文件；并将配色从暗色调切换为仿 iOS / GBoard 的浅色手机键盘风格。

## 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/vue/keyboard-styles.ts` | **删除** | CSS 已迁移至 VirtualKeyboardApp.vue |
| `src/vue/VirtualKeyboardApp.vue` | **重写** | 内联 `buildCSS()` + `onMounted/onUnmounted` 注入；浅色主题 |
| `src/vue/composables/useVirtualKeyboard.ts` | **精简** | 移除 `injectKeyboardStyle` 导入、`DEFAULT_Z_INDEX` 常量、`zIndex` 解构 |

## 架构变化

- CSS 以模板字符串 `buildCSS(zIndex)` 定义在 `VirtualKeyboardApp.vue` 的 `<script setup>` 内
- `onMounted` 注入 `<style id="__kiosk_virtual_keyboard_style">`；`onUnmounted` 移除
- composable 不再关心样式注入，职责更纯粹

## 浅色主题设计

| 元素 | 颜色 | 说明 |
|------|------|------|
| 键盘面板 | `#CDD0D5` | iOS 键盘背景灰 |
| 普通按键 | `#FFFFFF` + `0 1px 0 rgba(0,0,0,0.38)` 阴影 | 白键带立体感 |
| 功能键（muted） | `#ACB3BB` | 稍暗灰，区分字母键 |
| 强调键（accent） | `#007AFF` | iOS 蓝 |
| 选中候选词 | `#007AFF` 底 + 白字 | 首候选高亮 |
| 文字 | `#1C1C1E` | 近黑，对比度充足 |

## 测试结果

- 构建：✅ `dist/index.js` 112 KB，零警告
- 测试：✅ 6/6 通过（keyboard-model 单元测试）
- ipc 包构建：✅ 零错误
