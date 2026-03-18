## rime renderer拆分计划书

### 拆分目标
把当前挂在 `packages/plugin-rime/src/renderer` 的虚拟键盘 UI，从 `@kiosk/plugin-rime` 中拆出为独立 package，
后续可平滑替换为 Vue 实现，同时不破坏现有 IME core、IPC 和 preload 自动注入链路。

### 现状边界

IME 核心能力在 `packages/plugin-rime/src/index.ts`、`packages/plugin-rime/src/worker`、`packages/plugin-rime/src/core`
虚拟键盘 UI 在 `packages/plugin-rime/src/renderer/index.ts` 和 `packages/plugin-rime/src/renderer/model.ts`
preload 自动注入在 `packages/ipc/src/preload.ts`
主进程 IME IPC 在 `packages/ipc/src/handlers/ime/index.ts`

### 建议的新结构
新增 package：`packages/plugin-rime-renderer`
建议目录：
```text
packages/plugin-rime-renderer/
├── src/
│   ├── index.ts
│   ├── install.ts
│   ├── types.ts
│   ├── core/
│   │   ├── keyboard-model.ts
│   │   ├── ime-adapter.ts
│   │   └── dom-target.ts
│   ├── vue/
│   │   ├── VirtualKeyboardApp.vue
│   │   ├── components/
│   │   └── composables/
│   └── styles/
│       └── virtual-keyboard.css
├── src/__tests__/
├── package.json
├── tsconfig.json
└── vite.config.ts
```
### 拆分原则
- @kiosk/plugin-rime 只保留 IME engine、WASM、schema、worker，不再导出 renderer UI
- UI package 只依赖 @kiosk/shared 和 preload 暴露的 IME bridge，不直接碰主进程
- 先抽“无框架 core”，再接 Vue，避免把业务逻辑锁死在组件里
- preload 层继续只调用 installVirtualKeyboardPlugin()，这样宿主接线改动最小

### 实施步骤
1. 新建 packages/plugin-rime-renderer
  - package 名建议 @kiosk/plugin-rime-renderer
  - 配置 TS 严格模式
  - 构建产物输出 dist
  - 对外导出 installVirtualKeyboardPlugin、VirtualKeyboardOptions、VirtualKeyboardHandle

2. 迁移纯逻辑
  - 从 packages/plugin-rime/src/renderer/model.ts 提取到新包 src/core/keyboard-model.ts
  - 这部分保持无 DOM 框架依赖，可直接复用现有单测

3. 迁移 UI 安装入口
  - 从 packages/plugin-rime/src/renderer/index.ts 提取公共接口与控制器语义
  - 在新包里先实现一个兼容版 installVirtualKeyboardPlugin()
  - 第一阶段可以先用 Vue 挂载一个 root 节点，但内部行为保持与现有插件一致

4.引入 Vue
  - 使用 Vue 3
  - 组件职责只负责渲染和交互
  - 输入法状态、候选词、模式切换、activeTarget 管理放到 composable 或 service，不要塞进单文件组件模板

5. 修改 IPC preload 接线
  - 将 packages/ipc/src/preload.ts 中的`@kiosk/plugin-rime/renderer`改为`@kiosk/plugin-rime-renderer`
  - 保持 installImeVirtualKeyboard() 的调用签名不变

6. 清理类型影子
  - 删除或迁移 packages/ipc/src/plugin-rime-renderer.d.ts
  - 改为直接依赖新包真实导出的类型
  - 如果 TS 解析仍受 tsconfig.base.json 的 moduleResolution: "node" 影响，至少先补新包 path alias；更稳的是逐步改到 node16 或 bundler

7. 收缩旧包职责
  - 从 packages/plugin-rime/src/index.ts 移除 ./renderer 导出
  - 保留 core/worker/config 导出
  - 只在确实需要兼容旧调用方时，临时保留一个 deprecated re-export，一旦 ipc 切完就删

8. 更新宿主构建
  - apps/kiosk/package.json 的 build:preload-deps 增加新包构建
  - apps/kiosk/scripts/bundle-preload.js 继续通过 workspace package exports 解析新包
  - 确认 preload bundle 能把新 UI 包正确打进去
  
9. 补测试
  - 新包单测：迁移 virtual-keyboard-model.test.ts
  - 新包组件/安装测试：覆盖挂载、聚焦显示、失焦隐藏、候选词点击、模式切换
  - IPC 侧：更新 packages/ipc/src/__tests__/preload.test.ts 的 mock 路径
  - 若删掉旧导出，补一条编译级测试确保旧 import 已全部清理
