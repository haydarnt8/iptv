import type { EpgGridRow, EpgNowNext, EpgProgramme, EpgStatus } from '#shared/types/epg'

/** Thin client-side repository over /api/epg/**. */
export function useEpgApi() {
  return {
    getStatus: () => $fetch<EpgStatus>('/api/epg/status'),
    refresh: () => $fetch<EpgStatus>('/api/epg/refresh', { method: 'POST' }),
    getSources: () => $fetch<string[]>('/api/epg/sources'),
    setSources: (urls: string[]) => $fetch<string[]>('/api/epg/sources', { method: 'PUT', body: { urls } }),
    getNowNext: (streamIds: number[]) =>
      $fetch<EpgNowNext[]>('/api/epg/now', { method: 'POST', body: { streamIds } }),
    getSchedule: (streamId: number) => $fetch<EpgProgramme[]>(`/api/epg/channel/${streamId}`),
    getGrid: (streamIds: number[], from: number, to: number) =>
      $fetch<EpgGridRow[]>('/api/epg/grid', { method: 'POST', body: { streamIds, from, to } })
  }
}
