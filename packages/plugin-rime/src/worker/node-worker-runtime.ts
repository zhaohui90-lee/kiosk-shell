type WorkerMessageEvent = {
  data: unknown
}

type WorkerMessageHandler = ((event: WorkerMessageEvent) => void) | null
type WorkerErrorHandler = ((error: Error) => void) | null

interface WorkerLike {
  onmessage: WorkerMessageHandler
  onerror?: WorkerErrorHandler
  postMessage(message: unknown, transferables?: readonly ArrayBuffer[]): void
  terminate(): void
}

type WorkerCtor = new (scriptURL: string) => WorkerLike

interface WorkerGlobal {
  Worker?: WorkerCtor
  __kioskNodeWorkerShimInstalled__?: boolean
}

interface WorkerThreadLike {
  on(event: 'message', listener: (message: unknown) => void): this
  on(event: 'error', listener: (error: Error) => void): this
  postMessage(message: unknown, transferList?: readonly ArrayBuffer[]): void
  terminate(): Promise<number>
}

interface WorkerThreadsModule {
  Worker: new (
    filename: string,
    options?: {
      workerData?: unknown
    },
  ) => WorkerThreadLike
}

interface PathModule {
  isAbsolute(path: string): boolean
  resolve(...paths: string[]): string
  join(...paths: string[]): string
  basename(path: string): string
}

interface UrlModule {
  fileURLToPath(url: string): string
}

interface FsModule {
  existsSync(path: string): boolean
}

const NODE_WORKER_BOOTSTRAP_FILE = 'node-worker-bootstrap.js'

function getRuntimeGlobal(): WorkerGlobal {
  return globalThis as WorkerGlobal
}

function getPathModule(): PathModule {
  return require('node:path') as PathModule
}

function getUrlModule(): UrlModule {
  return require('node:url') as UrlModule
}

function getFsModule(): FsModule {
  return require('node:fs') as FsModule
}

function getWorkerThreadsModule(): WorkerThreadsModule {
  return require('node:worker_threads') as WorkerThreadsModule
}

function hasWorkerRuntime(): boolean {
  return typeof getRuntimeGlobal().Worker === 'function'
}

function resolveRuntimeFile(fileName: string): string {
  const path = getPathModule()
  const fs = getFsModule()
  const localPath = path.join(__dirname, fileName)
  if (fs.existsSync(localPath)) {
    return localPath
  }
  const distPath = path.resolve(__dirname, '../../dist/worker', fileName)
  if (fs.existsSync(distPath)) {
    return distPath
  }
  return localPath
}

function resolveNodeScriptPath(scriptURL: string): string {
  const path = getPathModule()
  const fs = getFsModule()
  const resolvedScriptURL = scriptURL.endsWith('.js') ? scriptURL : `${scriptURL}.js`

  if (resolvedScriptURL.startsWith('file://')) {
    return getUrlModule().fileURLToPath(resolvedScriptURL)
  }

  if (path.isAbsolute(resolvedScriptURL)) {
    return resolvedScriptURL
  }

  const localPath = path.resolve(__dirname, resolvedScriptURL)
  if (fs.existsSync(localPath)) {
    return localPath
  }

  const distPath = path.resolve(__dirname, '../../dist/worker', path.basename(resolvedScriptURL))
  if (fs.existsSync(distPath)) {
    return distPath
  }

  return localPath
}

class NodeWorkerShim implements WorkerLike {
  public onmessage: WorkerMessageHandler = null
  public onerror: WorkerErrorHandler = null

  private readonly workerThread: WorkerThreadLike
  private startupError: Error | null = null

  constructor(scriptURL: string) {
    const { Worker } = getWorkerThreadsModule()
    const targetScript = resolveNodeScriptPath(scriptURL)
    const bootstrapScript = resolveRuntimeFile(NODE_WORKER_BOOTSTRAP_FILE)

    this.workerThread = new Worker(bootstrapScript, {
      workerData: { targetScript },
    })

    this.workerThread.on('message', (message: unknown) => {
      this.onmessage?.({ data: message })
    })
    this.workerThread.on('error', (error: Error) => {
      if (this.onmessage) {
        this.dispatchWorkerError(error)
      } else {
        this.startupError = error
      }
      this.onerror?.(error)
    })
  }

  postMessage(message: unknown, transferables: readonly ArrayBuffer[] = []): void {
    if (this.startupError) {
      this.dispatchWorkerError(this.startupError)
      this.startupError = null
      return
    }
    this.workerThread.postMessage(message, transferables)
  }

  terminate(): void {
    void this.workerThread.terminate()
  }

  private dispatchWorkerError(error: Error): void {
    this.onmessage?.({
      data: {
        type: 'error',
        error: {
          name: error.name,
          message: error.message,
        },
      },
    })
  }
}

function installNodeWorkerShim(): void {
  const runtimeGlobal = getRuntimeGlobal()

  if (runtimeGlobal.__kioskNodeWorkerShimInstalled__) {
    return
  }

  runtimeGlobal.Worker = NodeWorkerShim as unknown as WorkerCtor
  runtimeGlobal.__kioskNodeWorkerShimInstalled__ = true
}

export function ensureLambdaWorkerRuntime(): void {
  if (hasWorkerRuntime()) {
    return
  }

  installNodeWorkerShim()
}

export function resolveLambdaWorkerScript(scriptURL: string): string {
  const runtimeGlobal = getRuntimeGlobal()

  if (!runtimeGlobal.__kioskNodeWorkerShimInstalled__) {
    return scriptURL
  }

  return resolveNodeScriptPath(scriptURL)
}
