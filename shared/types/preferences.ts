import type { LiveStream } from './xtream'

/**
 * Per-profile Live TV state kept on the server. Channels are stored as snapshots so Favorites and
 * "continue watching" render without loading every category first.
 */
export interface LivePreferences {
  favorites: LiveStream[]
  /** Most recent first; the first entry is the channel to resume. */
  recentChannels: LiveStream[]
  lastCategoryId: string | null
}

export interface LivePreferencesPatch {
  favorites?: LiveStream[]
  lastCategoryId?: string | null
  /** Moves this channel to the front of `recentChannels`. */
  watched?: LiveStream
}
