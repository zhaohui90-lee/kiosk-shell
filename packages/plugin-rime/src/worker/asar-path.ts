import fs from 'node:fs'
import path from 'node:path'

const ASAR_SEGMENT = `${path.sep}app.asar${path.sep}`
const ASAR_UNPACKED_SEGMENT = `${path.sep}app.asar.unpacked${path.sep}`

export function toUnpackedPath(filePath: string): string {
  if (filePath.includes(ASAR_UNPACKED_SEGMENT) || !filePath.includes(ASAR_SEGMENT)) {
    return filePath
  }

  return filePath.replace(ASAR_SEGMENT, ASAR_UNPACKED_SEGMENT)
}

export function preferUnpackedPath(
  filePath: string,
  existsSync: (candidate: string) => boolean = fs.existsSync,
): string {
  const unpackedPath = toUnpackedPath(filePath)

  if (unpackedPath !== filePath && existsSync(unpackedPath)) {
    return unpackedPath
  }

  return filePath
}
