import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isSpecialProcessInput, normalizeProcessInput } from '../worker/input-sequence'

describe('input-sequence', () => {
  it('wraps supported special keys into Rime key sequences', () => {
    assert.equal(normalizeProcessInput('BackSpace'), '{BackSpace}')
    assert.equal(normalizeProcessInput('Enter'), '{Return}')
    assert.equal(normalizeProcessInput('ArrowLeft'), '{Left}')
    assert.equal(normalizeProcessInput('PageDown'), '{Page_Down}')
  })

  it('normalizes modifier combinations used by schema bindings', () => {
    assert.equal(normalizeProcessInput('Control+g'), '{Control+g}')
    assert.equal(normalizeProcessInput('Shift+Tab'), '{Shift+Tab}')
    assert.equal(normalizeProcessInput('Ctrl+['), '{Control+bracketleft}')
  })

  it('keeps printable text unchanged', () => {
    assert.equal(normalizeProcessInput('ni'), 'ni')
    assert.equal(normalizeProcessInput(' '), ' ')
    assert.equal(isSpecialProcessInput('ni'), false)
    assert.equal(isSpecialProcessInput('BackSpace'), true)
  })
})
