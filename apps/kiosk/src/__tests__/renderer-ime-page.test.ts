import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const rendererIndexPath = join(__dirname, '..', '..', 'resources', 'renderer', 'index.html')

describe('Renderer IME Suggestion Page', () => {
  it('contains core ime test input regions', () => {
    const html = readFileSync(rendererIndexPath, 'utf-8')

    expect(html).toContain('id="test-input"')
    expect(html).toContain('id="test-textarea"')
    expect(html).toContain('id="test-editor"')
    expect(html).toContain('id="ime-log"')
    expect(html).toContain('id="candidate-list"')
  })

  it('contains ime ipc action buttons', () => {
    const html = readFileSync(rendererIndexPath, 'utf-8')

    expect(html).toContain('id="ime-schema"')
    expect(html).toContain('id="ime-process"')
    expect(html).toContain('id="ime-select"')
    expect(html).toContain('id="ime-next-page"')
    expect(html).toContain('id="ime-prev-page"')
    expect(html).toContain('id="ime-deploy"')
    expect(html).toContain('id="ime-reset"')
    expect(html).toContain('id="ime-option"')
  })

  it('binds composition event listeners and ime api calls', () => {
    const html = readFileSync(rendererIndexPath, 'utf-8')

    expect(html).toContain('compositionstart')
    expect(html).toContain('compositionupdate')
    expect(html).toContain('compositionend')

    expect(html).toContain("callIme('imeSetSchema'")
    expect(html).toContain("callIme('imeProcessInput'")
    expect(html).toContain("callIme('imeSelectCandidate'")
    expect(html).toContain("callIme('imeChangePage'")
    expect(html).toContain("callIme('imeSetOption'")
  })
})
