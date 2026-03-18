import {
  RimeKit as IRimeKit,
  RimeConfig,
  RimeContext,
  RimeEventHandler,
  RimeStatus,
  RIME_RESULT,
  RimeOptions,
} from '@kiosk/shared'

import {
  worker,
  resetUserDirectory,
  deploy,
  setIME,
  process,
  selectCandidateOnCurrentPage,
  setOption,
} from '../worker/worker-api'
import { getAvailableSchemaIds, getSchemaDisplayName } from './schema-registry'

export class RimeKit implements IRimeKit {
  private eventHandlers: Map<string, RimeEventHandler[]> = new Map()
  private isInitialized = false
  private currentStatus: RimeStatus = {
    schemaId: '',
    schemaName: '',
    isComposing: false,
    isAsciiMode: false,
    isFullShape: false,
    isSimplified: true,
  }
  private currentContext: RimeContext | null = null

  async init(config?: RimeConfig): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('[RimeKit] 开始初始化...')

      await this.performStandardInit(config)

      console.log('[RimeKit] 初始化完成')
      this.emit('ready', {})
    } catch (error) {
      this.isInitialized = false
      console.error('[RimeKit] 初始化失败:', error)
      throw new Error(`RIME Kit initialization failed: ${error}`)
    }
  }

  destroy(): void {
    this.eventHandlers.clear()
    this.currentContext = null
    this.isInitialized = false
  }

  async analyze(result: RIME_RESULT, rimeKey: string) {
    if (result.state === 0) {
      this.currentContext = null
      this.currentStatus.isComposing = false
      this.emit('context', null)
      this.emit('commit', result.committed)
      return {
        committed: result.committed,
        context: null,
        status: this.getStatus(),
      }
    }

    if (result.state === 1) {
      const composition = `${result.head}${result.body}${result.tail}`
      const context: RimeContext = {
        composition,
        candidates: result.candidates,
        cursorPosition: result.head.length + rimeKey.length,
        pageIndex: result.page,
        pageSize: result.candidates.length,
        hasMore: !result.isLastPage,
      }

      this.currentContext = context
      this.currentStatus.isComposing = composition.length > 0
      this.emit('context', context)
      return {
        committed: result.committed ?? null,
        context,
        status: this.getStatus(),
      }
    }

    if (result.state === 2 && result.updatedSchema) {
      this.currentStatus.schemaId = result.updatedSchema
      this.currentStatus.schemaName = getSchemaDisplayName(result.updatedSchema)
      this.emit('status', this.currentStatus)
    }

    this.currentContext = null
    this.currentStatus.isComposing = false
    this.emit('context', null)
    return {
      committed: null,
      context: null,
      status: this.getStatus(),
    }
  }

  async processInput(text: string) {
    if (!this.isInitialized) {
      throw new Error('RIME Kit not initialized')
    }

    const result = await process(text)
    return this.analyze(result, text)
  }

  async selectCandidate(index: number): Promise<string | null> {
    if (!this.isInitialized || !this.currentContext) {
      return null
    }

    try {
      const result = await selectCandidateOnCurrentPage(index)

      if (result) {
        // 重新获取上下文
        await this.processInput('')
        this.emit('candidate', { index, text: result })
        return result
      }

      return null
    } catch (error) {
      console.error('Select candidate error:', error)
      return null
    }
  }

  async commitComposition(): Promise<string | null> {
    if (!this.currentContext || !this.currentContext.composition) {
      return null
    }

    const text = this.currentContext.composition
    this.currentContext = null
    this.currentStatus.isComposing = false

    this.emit('commit', text)
    return text
  }

  clearComposition(): void {
    this.currentContext = null
    this.currentStatus.isComposing = false
    this.emit('context', null)
  }

  getStatus(): RimeStatus {
    return { ...this.currentStatus }
  }

  on(event: string, handler: RimeEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  off(event: string, handler: RimeEventHandler): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  async deploy(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('RIME Kit not initialized')
    }

    try {
      // deploy 在真实环境中是同步的，但可能被包装为 Promise
      const result = deploy()
      if (result && typeof result.then === 'function') {
        await result
      }

      console.log('[RimeKit] 部署完成')
      this.emit('deploy', { status: 'success' })
    } catch (error) {
      console.error('[RimeKit] 部署失败:', error)
      this.emit('deploy', { status: 'error', error })
      throw error
    }
  }

  async reset(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    try {
      // resetUserDirectory 在真实环境中是异步的，需要等待
      const result = resetUserDirectory()
      if (result && typeof result.then === 'function') {
        await result
      }

      this.currentContext = null
      this.currentStatus.isComposing = false
      console.log('[RimeKit] 重置完成')
      this.emit('reset', {})
    } catch (error) {
      console.error('[RimeKit] 重置失败:', error)
      throw error
    }
  }

  async setOptions(options: RimeOptions): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('RIME Kit not initialized')
    }
    return this.setOptionsInternal(options)
  }

  private async setOptionsInternal(options: RimeOptions): Promise<void> {
    const optionMap = {
      asciiMode: 'ascii_mode',
      fullShape: 'full_shape',
      simplification: 'simplification',
      asciiPunct: 'ascii_punct',
      emojiSuggestion: 'emoji_suggestion',
    }

    for (const [key, value] of Object.entries(options)) {
      if (key in optionMap && typeof value === 'boolean') {
        const optionName = optionMap[key as keyof typeof optionMap]

        try {
          // 处理同步/异步兼容性，添加超时保护
          await setOption(optionName, value)
          console.log(`[RimeKit] 设置选项成功: ${optionName} = ${value}`)
        } catch (error) {
          console.error(`[RimeKit] 设置选项失败: ${optionName} = ${value}`, error)
          // 继续处理其他选项，不要因为一个选项失败就中断
        }

        // 更新内部状态
        switch (key) {
          case 'asciiMode':
            this.currentStatus.isAsciiMode = value
            break
          case 'fullShape':
            this.currentStatus.isFullShape = value
            break
          case 'simplification':
            this.currentStatus.isSimplified = value
            break
        }
      }
    }

    this.emit('status', this.currentStatus)
  }

  async setSchema(schemaId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('RIME Kit not initialized')
    }

    try {
      // setIME 在真实环境中是异步的，需要等待，添加超时保护
      await setIME(schemaId)

      this.currentStatus.schemaId = schemaId
      this.currentStatus.schemaName = getSchemaDisplayName(schemaId)
      this.emit('status', this.currentStatus)
      console.log(`[RimeKit] 切换方案成功: ${schemaId}`)
      return true
    } catch (error) {
      console.error('[RimeKit] 切换方案失败:', error)
      return false
    }
  }

  private async performStandardInit(config?: RimeConfig): Promise<void> {
    console.log('[RimeKit] 直接使用导入的方法')

    // 等待 worker 准备就绪
    if (worker) {
      console.log('[RimeKit] 等待 worker 准备就绪...')
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    // 获取并验证 schema 配置
    const targetSchema = this.selectTargetSchema(config)
    console.log('[RimeKit] 选择的方案:', targetSchema)

    // 标记为已初始化（在设置之前）
    this.isInitialized = true

    // 设置输入方案
    if (targetSchema) {
      await this.setSchemaInternal(targetSchema)
    }

    // 设置默认选项
    if (config?.defaultOptions) {
      console.log('[RimeKit] 设置默认选项:', config.defaultOptions)
      await this.setOptionsInternal(config.defaultOptions)
    }
  }

  private selectTargetSchema(config?: RimeConfig): string {
    // 优先级：配置中的 defaultSchema -> defaultOptions.schema -> 第一个可用方案
    const requestedSchema = config?.defaultSchema || config?.defaultOptions?.schema

    const availableSchemas = this.getAvailableSchemas()

    if (requestedSchema && availableSchemas.includes(requestedSchema)) {
      return requestedSchema
    }

    return availableSchemas[0] || 'luna_pinyin' // 默认回退方案
  }

  private async setSchemaInternal(schemaId: string): Promise<void> {
    try {
      await setIME(schemaId)
      this.currentStatus.schemaId = schemaId
      this.currentStatus.schemaName = getSchemaDisplayName(schemaId)
      this.emit('status', this.currentStatus)
      console.log(`[RimeKit] 内部设置方案成功: ${schemaId}`)
    } catch (error) {
      console.error(`[RimeKit] 内部设置方案失败: ${schemaId}`, error)
      throw error
    }
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler({
            type: event as 'candidate' | 'commit' | 'context',
            data,
          })
        } catch (error) {
          console.error('Event handler error:', error)
        }
      })
    }
  }

  getAvailableSchemas(): string[] {
    return getAvailableSchemaIds()
  }
}
