// Re-export all config files
export { default as schemaName } from '../config/schema-name.json'
export { default as schemaFiles } from '../config/schema-files.json'
export { default as schemaTarget } from '../config/schema-target.json'
export { default as schemas } from '../config/schemas.json'
export { default as dependencyMap } from '../config/dependency-map.json'
export { default as targetFiles } from '../config/target-files.json'
export { default as targetVersion } from '../config/target-version.json'
export { default as fonts } from '../config/fonts.json'

// Type definitions
export interface SchemaName {
  [key: string]: string
}

export interface SchemaFiles {
  [key: string]: {
    dict?: string
    prism?: string
  }
}

export interface SchemaTarget {
  [key: string]: string
}

export interface DependencyMap {
  [key: string]: string[] | undefined
}

export interface TargetFile {
  name: string
  md5: string
}

export interface TargetFiles {
  [key: string]: TargetFile[]
}

export interface TargetVersion {
  [key: string]: string
}

export interface Fonts {
  name: string,
  fontFamily: string,
  files: string[],
  version: string
}