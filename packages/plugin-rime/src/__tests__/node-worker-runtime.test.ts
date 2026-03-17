import assert from 'node:assert/strict'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { ensureLambdaWorkerRuntime, resolveLambdaWorkerScript } from '../worker/node-worker-runtime'

type WorkerMessageEvent = {
  data: unknown
}

type WorkerLike = {
  onmessage: ((event: WorkerMessageEvent) => void) | null
  postMessage(message: unknown, transferables?: readonly ArrayBuffer[]): void
  terminate(): void
}

type WorkerCtor = new (scriptURL: string) => WorkerLike

interface WorkerGlobal {
  Worker?: WorkerCtor
  __kioskNodeWorkerShimInstalled__?: boolean
}

const runtimeGlobal = globalThis as WorkerGlobal
const originalWorker = runtimeGlobal.Worker
const originalShimFlag = runtimeGlobal.__kioskNodeWorkerShimInstalled__

function restoreRuntimeGlobal(): void {
  runtimeGlobal.Worker = originalWorker
  runtimeGlobal.__kioskNodeWorkerShimInstalled__ = originalShimFlag
}

class BrowserWorkerStub implements WorkerLike {
  public onmessage: ((event: WorkerMessageEvent) => void) | null = null

  constructor(_scriptURL: string) {}

  postMessage(_message: unknown, _transferables: readonly ArrayBuffer[] = []): void {}

  terminate(): void {}
}

describe('node-worker-runtime', () => {
  afterEach(() => {
    restoreRuntimeGlobal()
  })

  it('returns original script url when native Worker exists', () => {
    runtimeGlobal.Worker = BrowserWorkerStub
    runtimeGlobal.__kioskNodeWorkerShimInstalled__ = false

    const resolved = resolveLambdaWorkerScript('./worker')

    assert.equal(resolved, './worker')
  })

  it('installs shim and resolves absolute worker path when Worker is missing', () => {
    runtimeGlobal.Worker = undefined
    runtimeGlobal.__kioskNodeWorkerShimInstalled__ = false

    ensureLambdaWorkerRuntime()
    const resolved = resolveLambdaWorkerScript('./worker')

    assert.equal(typeof runtimeGlobal.Worker, 'function')
    assert.equal(runtimeGlobal.__kioskNodeWorkerShimInstalled__, true)
    assert.equal(path.isAbsolute(resolved), true)
    assert.equal(resolved.endsWith(`${path.sep}worker.js`), true)
  })
})
