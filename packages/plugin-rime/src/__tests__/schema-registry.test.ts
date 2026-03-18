import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getAvailableSchemaIds, getSchemaDisplayName } from '../core/schema-registry'

describe('schema-registry', () => {
  it('returns configured schema ids, including family schemas', () => {
    const schemaIds = getAvailableSchemaIds()

    assert.equal(schemaIds.includes('luna_pinyin'), true)
    assert.equal(schemaIds.includes('double_pinyin_abc'), true)
    assert.equal(schemaIds.includes('cangjie5_express'), true)
  })

  it('returns configured display names and falls back to schema id', () => {
    assert.equal(getSchemaDisplayName('terra_pinyin'), '地球拼音')
    assert.equal(getSchemaDisplayName('unknown_schema'), 'unknown_schema')
  })
})
