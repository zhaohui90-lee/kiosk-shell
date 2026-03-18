import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const rendererIndexPath = join(__dirname, '..', '..', 'resources', 'renderer', 'rime-index.html')

describe('Renderer IME Suggestion Page', () => {
  it('contains core ime test input regions', () => {
    const html = readFileSync(rendererIndexPath, 'utf-8')

    expect(html).toContain('id="status-bar"')
    expect(html).toContain('id="output-area"')
    expect(html).toContain('id="comp-bar"')
    expect(html).toContain('id="cand-list"')
    expect(html).toContain('id="keyboard"')
    expect(html).toContain('id="log"')
    expect(html).toContain('committedCursor')
  })

  it('contains ime ipc action buttons', () => {
    const html = readFileSync(rendererIndexPath, 'utf-8')

    expect(html).toContain('id="sel-schema"')
    expect(html).toContain('id="sel-page-size"')
    expect(html).toContain('id="btn-prev"')
    expect(html).toContain('id="btn-next"')
    expect(html).toContain('id="btn-direct"')
    expect(html).toContain('id="btn-ascii"')
    expect(html).toContain('id="btn-emoji"')
  })

  it('binds composition event listeners and ime api calls', () => {
    const html = readFileSync(rendererIndexPath, 'utf-8')

    expect(html).toContain("api.imeSetSchema")
    expect(html).toContain("api.imeProcessInput")
    expect(html).toContain("api.imeSelectCandidate")
    expect(html).toContain("api.imeChangePage")
    expect(html).toContain("api.imeSetOption")
    expect(html).toContain("api.imeSetPageSize")
    expect(html).toContain('resolveImeKeyFromKeyboardEvent')
    expect(html).toContain('normalizeImePayload')
    expect(html).toContain('applyUnhandledSpecialKey')
    expect(html).toContain('ArrowLeft')
    expect(html).toContain("key === 'Tab'")
    expect(html).toContain("key >= '1' && key <= '9'")
    expect(html).toContain("key === '0' ? 9 : parseInt(key, 10) - 1")
    expect(html).toContain("emoji_suggestion")
    expect(html).toContain('doSetCandidatePageSize')
  })
})
