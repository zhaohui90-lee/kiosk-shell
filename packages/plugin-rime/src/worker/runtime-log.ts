const IGNORED_RUNTIME_WARNINGS = [
  'unsupported syscall: __syscall_prlimit64',
]

export function shouldIgnoreRuntimeWarning(message: string): boolean {
  return IGNORED_RUNTIME_WARNINGS.some((warning) => message.includes(warning))
}
