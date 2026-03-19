import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const mainEntryPath = join(__dirname, '..', 'main', 'index.ts')

describe('main process exit wiring', () => {
  it('runs cleanup from the real before-quit hook and stops recovery timers', () => {
    const source = readFileSync(mainEntryPath, 'utf8')

    expect(source).toContain('lifecycleManager.initialize()')
    expect(source).toContain("app.on('before-quit', () => {")
    expect(source).toContain('void cleanup()')
    expect(source).toContain('stopBlankDetection(mainWindow)')
    expect(source).toContain('stopCrashMonitoring(mainWindow)')
    expect(source).toContain('cancelAutoRetry(mainWindow)')
  })
})
