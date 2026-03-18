import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldIgnoreRuntimeWarning } from '../worker/runtime-log'

describe('runtime-log', () => {
  it('ignores the known prlimit64 syscall warning', () => {
    assert.equal(
      shouldIgnoreRuntimeWarning('warning: unsupported syscall: __syscall_prlimit64'),
      true,
    )
  })

  it('keeps other runtime messages visible', () => {
    assert.equal(shouldIgnoreRuntimeWarning('warning: unsupported syscall: __syscall_open'), false)
  })
})
