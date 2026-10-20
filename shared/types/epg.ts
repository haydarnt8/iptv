export interface EpgProgramme {
  /** Epoch milliseconds. */
  start: number
  stop: number
  title: string
  description: string | null
}

export interface EpgNowNext {
  streamId: number
  now: EpgProgramme | null
  next: EpgProgramme | null
}

export type EpgMatchMethod = 'id' | 'normalizedId' | 'name'

export interface EpgSourceStatus {
  /** Never the provider's own URL: it embeds the account credentials. */
  label: string
  isProvider: boolean
  ok: boolean
  error: string | null
  channels: number
  programmes: number
}

export interface EpgStatus {
  state: 'never' | 'building' | 'ready' | 'error'
  builtAt: string | null
  error: string | null
  totalChannels: number
  matchedChannels: number
  matchedBy: Record<EpgMatchMethod, number>
  programmes: number
  sources: EpgSourceStatus[]
}

export interface EpgGridRow {
  streamId: number
  programmes: EpgProgramme[]
}
