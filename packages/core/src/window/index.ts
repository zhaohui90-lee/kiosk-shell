// ─────────────────────────────────────────────
// 模块公开 API
// 外部只从这里导入，不直接引用内部文件
// ─────────────────────────────────────────────

// 主要入口
export { WindowManager, getWindowManager, resetWindowManager, createWindowManager } from './window-manager'

// 类型（从 src/types.ts 转发）
export type { WindowConfig, AdminWindowConfig } from '../types'

// Strategy（如果外部需要自定义策略）
export type { WindowStrategy } from './strategy/window-strategy'
export { KioskStrategy, DevStrategy, createStrategy } from './strategy/window-strategy'

// Builder（如果外部需要单独构建配置）
export { WindowOptionsBuilder } from './builder/window-options-builder'
