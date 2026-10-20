/** What a page offers to cast; the player adds the playback position for VOD. */
export interface CastMediaRequest {
  kind: 'live' | 'movie' | 'series'
  /** Stream id (live/movie) or episode id (series). */
  id: string
  /** Container extension for movies/episodes. */
  ext?: string
  title: string
  subtitle?: string
  image?: string | null
}

/** A stream link the TV can fetch on the local network. */
export interface CastMediaLink {
  url: string
  contentType: string
  isLive: boolean
}
