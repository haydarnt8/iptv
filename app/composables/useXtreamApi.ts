import type { XtreamAccountInfo } from '#shared/types/profile'
import type { LiveStream, SeriesDetails, SeriesSummary, VodDetails, VodStream, XtreamCategory } from '#shared/types/xtream'

/**
 * Thin client-side repository over /api/xtream/**. Keeps fetch calls out of
 * page/component code so Live TV/Movies/Series (later phases) consume this
 * instead of calling $fetch directly.
 */
export function useXtreamApi() {
  return {
    getAccountInfo: () => $fetch<XtreamAccountInfo>('/api/xtream/account'),

    getLiveCategories: () => $fetch<XtreamCategory[]>('/api/xtream/live/categories'),
    getLiveStreams: (categoryId?: string) =>
      $fetch<LiveStream[]>('/api/xtream/live/streams', { query: { categoryId } }),

    getVodCategories: () => $fetch<XtreamCategory[]>('/api/xtream/vod/categories'),
    getVodStreams: (categoryId?: string) =>
      $fetch<VodStream[]>('/api/xtream/vod/streams', { query: { categoryId } }),
    getVodDetails: (vodId: string) => $fetch<VodDetails>(`/api/xtream/vod/${vodId}`),

    getSeriesCategories: () => $fetch<XtreamCategory[]>('/api/xtream/series/categories'),
    getSeriesList: (categoryId?: string) =>
      $fetch<SeriesSummary[]>('/api/xtream/series', { query: { categoryId } }),
    getSeriesDetails: (seriesId: string) =>
      $fetch<SeriesDetails>(`/api/xtream/series/${seriesId}`)
  }
}
