import { parentPort, workerData } from 'node:worker_threads'

type MessageHandler = ((event: { data: unknown }) => void) | null

interface NodeWorkerRuntimeGlobal {
  self: NodeWorkerRuntimeGlobal
  onmessage: MessageHandler
  postMessage(payload: unknown, transferables?: readonly ArrayBuffer[]): void
  close(): void
  importScripts(...scripts: string[]): void
  require: NodeJS.Require | undefined
  __filename: string | undefined
  __dirname: string | undefined
}

interface WorkerDataPayload {
  targetScript?: unknown
}

interface PathModule {
  dirname(path: string): string
  isAbsolute(path: string): boolean
  resolve(...paths: string[]): string
}

interface UrlModule {
  fileURLToPath(url: string): string
}

interface FsModule {
  readFileSync(path: string, encoding: BufferEncoding): string
}

interface VmModule {
  runInThisContext(code: string, options: { filename: string }): unknown
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

function getVmModule(): VmModule {
  return require('node:vm') as VmModule
}

function resolveScriptPath(script: string, baseDir: string): string {
  const path = getPathModule()

  if (script.startsWith('http://') || script.startsWith('https://')) {
    throw new Error(`HTTP importScripts is not supported in Node worker runtime: ${script}`)
  }

  if (script.startsWith('file://')) {
    return getUrlModule().fileURLToPath(script)
  }

  if (path.isAbsolute(script)) {
    return script
  }

  return path.resolve(baseDir, script)
}

function requireInWorker(scriptPath: string): void {
  require(scriptPath)
}

function executeGlobalScript(scriptPath: string): void {
  const sourceCode = getFsModule().readFileSync(scriptPath, 'utf8')
  const path = getPathModule()
  const runtimeGlobal = globalThis as unknown as NodeWorkerRuntimeGlobal
  const originalRequire = runtimeGlobal.require
  const originalFilename = runtimeGlobal.__filename
  const originalDirname = runtimeGlobal.__dirname
  runtimeGlobal.require = require
  runtimeGlobal.__filename = scriptPath
  runtimeGlobal.__dirname = path.dirname(scriptPath)
  try {
    getVmModule().runInThisContext(sourceCode, { filename: scriptPath })
  } finally {
    runtimeGlobal.require = originalRequire
    runtimeGlobal.__filename = originalFilename
    runtimeGlobal.__dirname = originalDirname
  }
}

if (!parentPort) {
  throw new Error('Node worker runtime requires parentPort')
}
const nodeParentPort = parentPort

const payload = workerData as WorkerDataPayload
if (typeof payload.targetScript !== 'string' || payload.targetScript.length === 0) {
  throw new Error('Node worker runtime requires workerData.targetScript')
}

const path = getPathModule()
const targetScript = resolveScriptPath(payload.targetScript, process.cwd())
const targetScriptDir = path.dirname(targetScript)
const runtimeGlobal = globalThis as unknown as NodeWorkerRuntimeGlobal

runtimeGlobal.self = runtimeGlobal
runtimeGlobal.onmessage = null
runtimeGlobal.postMessage = (payloadMessage: unknown, transferables: readonly ArrayBuffer[] = []) => {
  nodeParentPort.postMessage(payloadMessage, transferables)
}
runtimeGlobal.close = () => {
  process.exit(0)
}
runtimeGlobal.importScripts = (...scripts: string[]) => {
  for (const script of scripts) {
    executeGlobalScript(resolveScriptPath(script, targetScriptDir))
  }
}

nodeParentPort.on('message', (message: unknown) => {
  runtimeGlobal.onmessage?.({ data: message })
})

requireInWorker(targetScript)
