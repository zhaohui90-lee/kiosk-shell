# Milestone: plugin-rime-renderer 引入 Vue 3 重写键盘模板

**日期**: 2026-03-18
**分支**: feat-admin-panel

## 目标

在 `@kiosk/plugin-rime-renderer` 中引入 Vue 3，将原先手动 innerHTML 渲染的 `VirtualKeyboardController` 重写为 Vue 单文件组件 + Composable 架构。

## 新增文件

| 文件 | 说明 |
|------|------|
| `src/types.ts` | 公共类型：`ImeApi`、`VirtualKeyboardOptions`、`VirtualKeyboardHandle` |
| `src/vue/keyboard-styles.ts` | CSS 字符串常量 + `injectKeyboardStyle()`，programmatic 注入，避免 vite lib CSS 提取问题 |
| `src/vue/composables/useVirtualKeyboard.ts` | 核心 composable：activeTarget 管理、IME 状态、document 事件监听、轮询、键位处理 |
| `src/vue/VirtualKeyboardApp.vue` | 根 Vue 组件，纯模板层，使用 `<script setup>` + `defineExpose({show, hide})` |
| `vite.config.ts` | vite lib build + @vitejs/plugin-vue + vite-plugin-dts，替代原先的 tsc |

## 架构要点

- **composable 承载所有业务逻辑**：focus 管理、IME 处理、模式切换、候选词选择均在 `useVirtualKeyboard.ts`，不泄漏进模板
- **Vue 模板只负责渲染**：条件显示（`v-if`）、列表渲染（`v-for`）、事件绑定（`@click`、`@pointerdown.prevent`）
- **CSS programmatic 注入**：保留原有 `#__kiosk_virtual_keyboard_root` 选择器体系，vite build 不提取 CSS 文件
- **install.ts 变为薄层**：`createApp(VirtualKeyboardApp, { options })` + `app.mount(container)`，通过 `defineExpose` 获得 `show/hide`
- **对外接口不变**：`installVirtualKeyboardPlugin(options): VirtualKeyboardHandle`，签名与上一版完全兼容

## 构建结果

- `dist/index.js`：111KB（含 Vue runtime），CJS 格式
- `dist/index.d.ts`：类型声明（via vite-plugin-dts）
- 测试：6/6 通过
- ipc 包构建：零错误
