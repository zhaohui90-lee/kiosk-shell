export enum ByteUnit {
  B = 'B',
  KB = 'KB',
  MB = 'MB',
  GB = 'GB',
}

const ByteUnitLabels: Record<ByteUnit, number> = {
  [ByteUnit.B]: 1,
  [ByteUnit.KB]: 1024,
  [ByteUnit.MB]: 1024 * 1024,
  [ByteUnit.GB]: 1024 * 1024 * 1024,
}

/**
 * Convert bytes to a human-readable format
 * @param bytes The number of bytes
 * @returns A string representing the size in an appropriate unit (B, KB, MB, GB)
 */
export function formatBytes(bytes: number, unitLabel: ByteUnit): string {
  const divisor = ByteUnitLabels[unitLabel]
  const value = bytes / divisor
  return unitLabel === ByteUnit.B ? `${value} ${ByteUnit.B}` : `${value.toFixed(2)} ${unitLabel}`
}
