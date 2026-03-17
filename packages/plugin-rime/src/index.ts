// 导出核心api
export {
  worker,
  FS,
  resetUserDirectory,
  setOption,
  setPageSize,
  deploy,
  process,
  selectCandidateOnCurrentPage,
  changePage,
  setIME
} from './worker/worker-api'

// 导出config
export {
  schemas,
  schemaName,
  schemaFiles,
  schemaTarget,
  dependencyMap,
  targetFiles,
  targetVersion,
  fonts
} from './config/config-index'
