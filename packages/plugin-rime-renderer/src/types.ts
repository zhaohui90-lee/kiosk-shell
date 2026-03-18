import type { RIME_RESULT } from '@kiosk/shared'

export type ImeApi = {
  imeSetSchema: (schemaId: string) => Promise<unknown>
  imeProcessInput: (input: string) => Promise<RIME_RESULT>
  imeSelectCandidate: (index: number) => Promise<string | null>
  imeSetPageSize: (size: number) => Promise<unknown>
  imeSetOption: (option: string, value: boolean) => Promise<unknown>
}

export type VirtualKeyboardOptions = {
  api: ImeApi
  defaultSchema?: string
  candidatePageSize?: number
  hideDelayMs?: number
  zIndex?: number
  showEmoji?: boolean
  simplified?: boolean
}

export type VirtualKeyboardHandle = {
  show: () => void
  hide: (force?: boolean) => void
  destroy: () => void
}
