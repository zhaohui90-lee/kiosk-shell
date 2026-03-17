import { expose, control, loadWasm, fsOperate } from '@libreservice/my-worker'
import { LazyCache } from '@libreservice/lazy-cache'
import schemaName from '../config/schema-name.json'
import schemaFiles from '../config/schema-files.json'
import schemaTarget from '../config/schema-target.json'
import dependencyMap from '../config/dependency-map.json'
import targetFiles from '../config/target-files.json'
import targetVersion from '../config/target-version.json'

import type { RIME_RESULT } from '@kiosk/shared'

const RIME_USER = '/rime'
const RIME_SHARED = '/usr/share/rime-data'

type DeployStatus = 'start' | 'failure' | 'success'

interface WasmFs {
  lookupPath(path: string): void
  mkdir(path: string): void
  mount(type: unknown, opts: Record<string, unknown>, mountPoint: string): void
  syncfs(read: boolean, callback: (err: unknown) => void): void
  readdir(path: string): string[]
  lstat(path: string): { mode: number }
  isDir(mode: number): boolean
  rmdir(path: string): void
  writeFile(path: string, content: Uint8Array): void
  unlink(path: string): void
}

interface WasmModule {
  FS: WasmFs
  ccall(
    name: string,
    returnType: string,
    argsType: string[],
    args: Array<string | number | boolean>,
  ): unknown
}

interface RuntimeGlobals {
  Module?: WasmModule
  IDBFS?: unknown
  _deployStatus?: (status: DeployStatus, schemas: string) => void
}

function getRuntimeGlobals(): RuntimeGlobals {
  return globalThis as RuntimeGlobals
}

function getModule(): WasmModule {
  const moduleRef = getRuntimeGlobals().Module
  if (!moduleRef) {
    throw new Error('RIME wasm Module is not ready')
  }
  return moduleRef
}

function getIDBFS(): unknown {
  const idbfs = getRuntimeGlobals().IDBFS
  if (!idbfs) {
    throw new Error('IDBFS runtime is not available')
  }
  return idbfs
}

let deployed = false
const deployStatus = control('deployStatus')
getRuntimeGlobals()._deployStatus = (status: DeployStatus, schemas: string) => {
  if (status === 'success') {
    deployed = true
  }
  deployStatus(status, schemas)
}

function getURL(target: string, name: string) {
  // 使用构建时注入的 CDN 地址
  const RIME_CDN = '__RIME_CDN__'
  const versionMap = targetVersion as Record<string, string>
  const version = versionMap[target]
  if (RIME_CDN && RIME_CDN !== '__RIME_CDN__') {
    if (!version) {
      throw new Error(`Missing target version for "${target}"`)
    }
    return RIME_CDN + `${target}@${version}/${name}`
  }
  return `ime/${target}/${name}`
}

const lazyCache = new LazyCache('ime')

async function fetchPrebuilt(schemaId: string) {
  const fetched: string[] = []
  const dependencyMapValue = dependencyMap as Record<string, string[] | undefined>
  const schemaFilesValue = schemaFiles as Record<string, { dict?: string; prism?: string } | undefined>
  const schemaTargetValue = schemaTarget as Record<string, string | undefined>
  const targetFilesValue = targetFiles as Record<string, Array<{ name: string; md5: string }> | undefined>

  function getFiles(key: string) {
    if (fetched.includes(key)) {
      return []
    }
    fetched.push(key)
    const files: {
      name: string
      md5: string
      target: string
    }[] = []

    for (const dependency of dependencyMapValue[key] || []) {
      files.push(...getFiles(dependency))
    }

    const schemaFile = schemaFilesValue[key]
    if (!schemaFile) {
      throw new Error(`Schema files config is missing for "${key}"`)
    }

    const { dict, prism } = schemaFile
    const dictionary = dict || key
    const tableBin = `${dictionary}.table.bin`
    const reverseBin = `${dictionary}.reverse.bin`
    const prismBin = `${prism || dictionary}.prism.bin`
    const schemaYaml = `${key}.schema.yaml`
    const target = schemaTargetValue[key]
    if (!target) {
      throw new Error(`Schema target is missing for "${key}"`)
    }

    const targetEntries = targetFilesValue[target]
    if (!targetEntries) {
      throw new Error(`Target files are missing for "${target}"`)
    }

    for (const fileName of [tableBin, reverseBin, prismBin, schemaYaml]) {
      for (const { name, md5 } of targetEntries) {
        if (fileName === name) {
          files.push({ name, md5, target })
          break
        }
      }
    }
    return files
  }
  const files = getFiles(schemaId)
  await Promise.all(files.map(async ({ name, target, md5 }) => {
    const path = `${RIME_SHARED}/build/${name}`
    const moduleRef = getModule()
    try {
      moduleRef.FS.lookupPath(path)
    } catch (e) { // not exists
      const ab = await lazyCache.get(name, md5, getURL(target, name))
      moduleRef.FS.writeFile(path, new Uint8Array(ab))
    }
  }))
}

async function setIME (schemaId: string) {
  if (!deployed) {
    await fetchPrebuilt(schemaId)
  }
  getModule().ccall('set_ime', 'null', ['string'], [schemaId])
  return syncUserDirectory('write')
}

function syncUserDirectory (direction: 'read' | 'write') {
  return new Promise<void>((resolve, reject) => {
    const moduleRef = getModule()
    moduleRef.FS.syncfs(direction === 'read', (err: unknown) => {
    if (err) {
      reject(err)
      return
    }
      resolve()
    })
  })
}

const readyPromise = loadWasm('rime.js', {
  url: '__LIBRESERVICE_CDN__',
  async init () {
    const moduleRef = getModule()
    moduleRef.FS.mkdir(RIME_USER)
    moduleRef.FS.mount(getIDBFS(), {}, RIME_USER)
    await syncUserDirectory('read')
    moduleRef.ccall('init', 'null', [], [])
    for (const [schema, name] of Object.entries(schemaName)) {
      moduleRef.ccall('set_schema_name', 'null', ['string', 'string'], [schema, name])
    }
  },
  Module: {
    // Customize for glog
    printErr (message: string) {
      const match = message.match(/[EWID]\S+ \S+ \S+ (.*)/)
      if (match) {
        ({
          E: console.error,
          W: console.warn,
          I: console.info,
          D: console.debug
        })[message[0] as 'E' | 'W' | 'I' | 'D'](match[1])
      } else {
        console.error(message)
      }
    }
  }
})

function rmStar (path: string) {
  const moduleRef = getModule()
  for (const file of moduleRef.FS.readdir(path)) {
    if (file === '.' || file === '..') {
      continue
    }
    const subPath = `${path}/${file}`
    const { mode } = moduleRef.FS.lstat(subPath)
    if (moduleRef.FS.isDir(mode)) {
      rmStar(subPath)
      moduleRef.FS.rmdir(subPath)
    } else {
      moduleRef.FS.unlink(subPath)
    }
  }
}

async function resetUserDirectory () {
  rmStar(RIME_USER)
  await syncUserDirectory('write')
  deployed = false
  getModule().ccall('reset', 'null', [], [])
}

expose({
  fsOperate,
  resetUserDirectory,
  setIME,
  setOption(option: string, value: boolean): void {
    getModule().ccall('set_option', 'null', ['string', 'number'], [option, value ? 1 : 0])
  },
  setPageSize(size: number) {
    return getModule().ccall('set_page_size', 'null', ['number'], [size])
  },
  deploy(): void {
    getModule().ccall('deploy', 'null', [], [])
  },
  async process(input: string): Promise<RIME_RESULT> {
    const result = JSON.parse(String(getModule().ccall('process', 'string', ['string'], [input]))) as RIME_RESULT
    if ('committed' in result) {
      await syncUserDirectory('write')
    }
    return result
  },
  selectCandidateOnCurrentPage(index: number): string {
    return String(getModule().ccall('select_candidate_on_current_page', 'string', ['number'], [index]))
  },
  changePage(backward: boolean): string {
    return String(getModule().ccall('change_page', 'string', ['boolean'], [backward]))
  }
}, readyPromise)
