import type {
  LiveStream,
  SeriesDetails,
  SeriesSummary,
  VodDetails,
  VodStream,
  XtreamCategory
} from '#shared/types/xtream'

/**
 * Xtream providers are inconsistent about field casing, missing keys, and
 * numbers-as-strings. These helpers coerce leniently instead of throwing,
 * since one bad field shouldn't break an entire list.
 */
export function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str.length > 0 ? str : null
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function toNumber(value: unknown, fallback = 0): number {
  return toNumberOrNull(value) ?? fallback
}

function normalizeParentId(raw: unknown): string | null {
  const value = toStringOrNull(raw)
  return value === '0' ? null : value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeCategory(raw: any): XtreamCategory {
  return {
    categoryId: toStringOrNull(raw?.category_id) ?? '',
    categoryName: toStringOrNull(raw?.category_name) ?? 'Unnamed',
    parentId: normalizeParentId(raw?.parent_id)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeLiveStream(raw: any): LiveStream {
  return {
    streamId: toNumber(raw?.stream_id),
    name: toStringOrNull(raw?.name) ?? 'Unknown channel',
    categoryId: toStringOrNull(raw?.category_id),
    streamIcon: toStringOrNull(raw?.stream_icon),
    epgChannelId: toStringOrNull(raw?.epg_channel_id)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeVodStream(raw: any): VodStream {
  return {
    streamId: toNumber(raw?.stream_id),
    name: toStringOrNull(raw?.name) ?? 'Unknown title',
    categoryId: toStringOrNull(raw?.category_id),
    streamIcon: toStringOrNull(raw?.stream_icon),
    rating: toNumberOrNull(raw?.rating),
    containerExtension: toStringOrNull(raw?.container_extension)
  }
}

/** get_vod_info splits data across an "info" object (metadata) and a "movie_data" object (stream_id/container). */
export function normalizeVodInfo(raw: unknown, fallbackStreamId: number): VodDetails {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = raw as any
  const info = data?.info ?? {}
  const movieData = data?.movie_data ?? {}

  return {
    streamId: toNumber(movieData?.stream_id, fallbackStreamId),
    name: toStringOrNull(movieData?.name ?? info?.name) ?? 'Unknown title',
    plot: toStringOrNull(info?.plot),
    cast: toStringOrNull(info?.cast),
    director: toStringOrNull(info?.director),
    genre: toStringOrNull(info?.genre),
    releaseDate: toStringOrNull(info?.release_date),
    rating: toNumberOrNull(info?.rating),
    durationSecs: toNumberOrNull(info?.duration_secs),
    cover: toStringOrNull(info?.movie_image ?? movieData?.cover),
    containerExtension: toStringOrNull(movieData?.container_extension)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSeriesSummary(raw: any): SeriesSummary {
  return {
    seriesId: toNumber(raw?.series_id),
    name: toStringOrNull(raw?.name) ?? 'Unknown series',
    categoryId: toStringOrNull(raw?.category_id),
    cover: toStringOrNull(raw?.cover),
    plot: toStringOrNull(raw?.plot),
    rating: toNumberOrNull(raw?.rating),
    releaseDate: toStringOrNull(raw?.release_date)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSeriesInfo(raw: any): SeriesDetails {
  const info = raw?.info ?? {}
  const seasonsRaw = Array.isArray(raw?.seasons) ? raw.seasons : []
  const episodesRaw = raw?.episodes && typeof raw.episodes === 'object' ? raw.episodes : {}

  const episodes = Object.entries(episodesRaw).flatMap(([seasonKey, list]) => {
    if (!Array.isArray(list)) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((episode: any) => ({
      id: toStringOrNull(episode?.id) ?? toStringOrNull(episode?.episode_num) ?? '',
      seasonNumber: toNumber(episode?.season, toNumber(seasonKey)),
      episodeNum: toNumber(episode?.episode_num),
      title: toStringOrNull(episode?.title) ?? `Episode ${toNumber(episode?.episode_num)}`,
      containerExtension: toStringOrNull(episode?.container_extension),
      plot: toStringOrNull(episode?.info?.plot ?? episode?.plot),
      durationSecs: toNumberOrNull(episode?.info?.duration_secs ?? episode?.duration_secs)
    }))
  })

  return {
    info: {
      seriesId: toNumber(info?.series_id ?? raw?.series_id),
      name: toStringOrNull(info?.name) ?? 'Unknown series',
      categoryId: toStringOrNull(info?.category_id),
      cover: toStringOrNull(info?.cover),
      plot: toStringOrNull(info?.plot),
      rating: toNumberOrNull(info?.rating),
      releaseDate: toStringOrNull(info?.release_date)
    },
    seasons: seasonsRaw.map((season: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = season as any
      return {
        seasonNumber: toNumber(s?.season_number),
        name: toStringOrNull(s?.name),
        overview: toStringOrNull(s?.overview),
        cover: toStringOrNull(s?.cover)
      }
    }),
    episodes
  }
}
