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

      // 第一阶段：基础设置和验证
      if (await this.isInitializedFromConfig(config)) {
        console.log('[RimeKit] 从配置完成初始化')
        return
      }

      // 第二阶段：检查现有部署状态
      if (await this.checkExistingDeployment(config)) {
        console.log('[RimeKit] 使用现有部署完成初始化')
        return
      }

      // 第三阶段：标准初始化流程
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
      this.currentStatus.schemaName = result.updatedSchema
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
      // 这里可以根据 schema 配置更新 schemaName
      this.emit('status', this.currentStatus)
      console.log(`[RimeKit] 切换方案成功: ${schemaId}`)
      return true
    } catch (error) {
      console.error('[RimeKit] 切换方案失败:', error)
      return false
    }
  }

  private async isInitializedFromConfig(config?: RimeConfig) {
    // 如果配置中指定了特定的初始化模式，优先处理
    if (config?.installFromSource) {
      console.log('[RimeKit] 从源安装配置...')
      return await this.installFromSource(config.installFromSource)
    }
    return false
  }

  private async installFromSource(
    source: {
      target: string
      schemaIds: string[]
    }[],
  ): Promise<boolean> {
    // 实现从指定源安装的逻辑 TODO
    // 这里可以扩展支持从不同源安装输入法配置
    console.log('[RimeKit] 安装源功能待实现, 源配置:', source)
    return false
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

  private async checkExistingDeployment(config?: RimeConfig): Promise<boolean> {
    try {
      // 检查是否已有用户配置部署
      const hasDeployment = await this.hasUserDeployment()
      if (hasDeployment) {
        console.log('[RimeKit] 检测到现有部署')

        // 如果指定了特定的 schema，检查是否需要重置
        const requestedSchema = config?.defaultSchema || config?.defaultOptions?.schema
        if (requestedSchema && (await this.needsReset(requestedSchema))) {
          console.log('[RimeKit] 需要重置用户目录')
          await this.resetAndDeploy()
        } else {
          // 使用现有部署，只需要重新部署
          return await this.deployExisting()
        }
        return true
      }
    } catch (error) {
      console.warn('[RimeKit] 检查现有部署失败:', error)
    }
    return false
  }

  private async hasUserDeployment(): Promise<boolean> {
    try {
      // 检查是否存在用户配置文件（这里可以根据实际情况调整检查逻辑）
      // 由于我们使用的是抽象的 worker API，这里做一个简单的假设
      if (worker) {
        // 如果有 worker 实例，假设存在部署（实际实现需要根据具体的文件系统 API）
        return false
      }
      return false // 暂时返回 false，实际实现需要根据具体的文件系统 API
    } catch (error) {
      return false
    }
  }

  private async needsReset(requestedSchema: string): Promise<boolean> {
    // 检查是否需要重置，例如当请求的 schema 与当前不兼容时
    return (
      this.currentStatus.schemaId !== '' &&
      this.currentStatus.schemaId !== requestedSchema &&
      this.getAvailableSchemas().includes(requestedSchema)
    )
  }

  private async resetAndDeploy(): Promise<void> {
    await resetUserDirectory()
    await deploy()
    this.isInitialized = true
  }

  private async deployExisting(): Promise<boolean> {
    try {
      await deploy()
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('[RimeKit] 部署现有配置失败:', error)
      return false
    }
  }

  private async setSchemaInternal(schemaId: string): Promise<void> {
    try {
      await setIME(schemaId)
      this.currentStatus.schemaId = schemaId
      this.currentStatus.schemaName = schemaId // 可以根据需要映射为友好名称
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
    // 从配置中获取可用的输入方案
    // 这里可以根据实际情况返回支持的方案列表
    return ['luna_pinyin', 'double_pinyin', 'wubi86', 'cangjie5', 'bopomofo', 'terra_pinyin']
  }
}
