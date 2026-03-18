import schemaName from '../config/schema-name.json'

const schemaNameMap = schemaName as Record<string, string>

export function getAvailableSchemaIds(): string[] {
  return Object.keys(schemaNameMap)
}

export function getSchemaDisplayName(schemaId: string): string {
  return schemaNameMap[schemaId] ?? schemaId
}
