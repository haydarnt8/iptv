export interface XtreamCategory {
  categoryId: string
  categoryName: string
  parentId: string | null
}

export interface LiveStream {
  streamId: number
  name: string
  categoryId: string | null
  streamIcon: string | null
  epgChannelId: string | null
}

export interface VodStream {
  streamId: number
  name: string
  categoryId: string | null
  streamIcon: string | null
  rating: number | null
  containerExtension: string | null
}

export interface VodDetails {
  streamId: number
  name: string
  plot: string | null
  cast: string | null
  director: string | null
  genre: string | null
  releaseDate: string | null
  rating: number | null
  durationSecs: number | null
  cover: string | null
  containerExtension: string | null
}

export interface SeriesSummary {
  seriesId: number
  name: string
  categoryId: string | null
  cover: string | null
  plot: string | null
  rating: number | null
  releaseDate: string | null
}

export interface SeriesSeason {
  seasonNumber: number
  name: string | null
  overview: string | null
  cover: string | null
}

export interface SeriesEpisode {
  id: string
  seasonNumber: number
  episodeNum: number
  title: string
  containerExtension: string | null
  plot: string | null
  durationSecs: number | null
}

export interface SeriesDetails {
  info: SeriesSummary
  seasons: SeriesSeason[]
  episodes: SeriesEpisode[]
}
