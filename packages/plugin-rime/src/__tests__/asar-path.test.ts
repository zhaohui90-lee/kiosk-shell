import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import { preferUnpackedPath, toUnpackedPath } from '../worker/asar-path'

describe('asar-path', () => {
  it('maps app.asar paths to app.asar.unpacked paths', () => {
    const input = path.join('/mock', 'resources', 'app.asar', 'node_modules', '@kiosk', 'plugin-rime', 'dist', 'worker.js')
    const expected = path.join('/mock', 'resources', 'app.asar.unpacked', 'node_modules', '@kiosk', 'plugin-rime', 'dist', 'worker.js')

    assert.equal(toUnpackedPath(input), expected)
  })

  it('prefers unpacked path when it exists', () => {
    const input = path.join('/mock', 'resources', 'app.asar', 'node_modules', '@kiosk', 'plugin-rime', 'src', 'wasm', 'rime.js')
    const expected = path.join('/mock', 'resources', 'app.asar.unpacked', 'node_modules', '@kiosk', 'plugin-rime', 'src', 'wasm', 'rime.js')

    assert.equal(preferUnpackedPath(input, (candidate) => candidate === expected), expected)
  })

  it('keeps the original path when unpacked file is absent', () => {
    const input = path.join('/mock', 'resources', 'app.asar', 'node_modules', '@kiosk', 'plugin-rime', 'src', 'wasm', 'rime.js')

    assert.equal(preferUnpackedPath(input, () => false), input)
  })
})
