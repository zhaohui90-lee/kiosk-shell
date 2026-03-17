// RIME 相关的共享类型定义
export interface RimeCandidate {
  text: string
  comment?: string
}

export interface RimeContext {
  composition: string
  candidates: RimeCandidate[]
  cursorPosition: number
  pageIndex: number
  pageSize: number
  hasMore: boolean
}

export interface RimeStatus {
  schemaId: string
  schemaName: string
  isComposing: boolean
  isAsciiMode: boolean
  isFullShape: boolean
  isSimplified: boolean
}

export interface RimeOptions {
  // 基础选项
  asciiMode?: boolean
  fullShape?: boolean
  simplification?: boolean
  asciiPunct?: boolean
  emojiSuggestion?: boolean
  
  // 高级选项
  pageSize?: number
  autoCommit?: boolean
  schema?: string
  ime?: string
}

export interface RimeConfig {
  // 环境配置
  wasmPath?: string
  schemaPath?: string
  userDataPath?: string
  
  // 默认选项
  defaultOptions?: RimeOptions
  defaultSchema?: string
  
  // 安装配置
  installFromSource?: {
    target: string
    schemaIds: string[]
  }[]
}

export interface RimeInputEvent {
  type: 'candidate' | 'commit' | 'context'
  data: any
}

export type RimeEventHandler = (event: RimeInputEvent) => void

// 简化的 API 接口
export interface RimeKit {
  // 核心方法
  init(config?: RimeConfig): Promise<void>
  destroy(): void
  
  // 输入处理
  processInput(text: string): void
  selectCandidate(index: number): Promise<string | null>
  commitComposition(): Promise<string | null>
  clearComposition(): void
  
  // 状态管理
  getStatus(): RimeStatus
  setSchema(schemaId: string): Promise<boolean>
  setOptions(options: RimeOptions): Promise<void>
  
  // 事件监听
  on(event: string, handler: RimeEventHandler): void
  off(event: string, handler: RimeEventHandler): void
  
  // 实用方法
  getAvailableSchemas(): string[]
  deploy(): Promise<void>
  reset(): Promise<void>
}

export interface RimeResult {
  committed?: string
  preedit?: string
  candidates?: string[]
  position?: number
  // ... 其他字段
}

export interface DeployStatus {
  status: 'start' | 'failure' | 'success'
  schemas: string
}
