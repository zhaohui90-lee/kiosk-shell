import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const builderConfigPath = join(__dirname, '..', '..', 'electron-builder.yml')

describe('electron-builder IME packaging config', () => {
  it('unpacks plugin-rime worker and wasm assets for packaged runtime access', () => {
    const config = readFileSync(builderConfigPath, 'utf8')

    expect(config).toContain('**/node_modules/@kiosk/plugin-rime/dist/worker/**/*')
    expect(config).toContain('**/node_modules/@kiosk/plugin-rime/src/wasm/**/*')
  })
})
