import type { LiveStream, SeriesSummary, VodStream } from './xtream'

export interface SearchResults {
  query: string
  live: LiveStream[]
  movies: VodStream[]
  series: SeriesSummary[]
  /** Matches before the per-type limit. */
  totals: { live: number, movies: number, series: number }
}
