import { defineStore } from 'pinia'
import type { EpgNowNext } from '#shared/types/epg'

export const useEpgStore = defineStore('epg', () => {
  const api = useEpgApi()
  // Replaced, never mutated: can hold a few hundred entries per category.
  const nowNextByStream = shallowRef(new Map<number, EpgNowNext>())

  /**
   * The guide is optional, so failures are swallowed: channels keep working
   * without programme info.
   */
  async function loadNowNext(streamIds: number[]) {
    if (!streamIds.length) return
    try {
      const results = await api.getNowNext(streamIds)
      const next = new Map(nowNextByStream.value)
      for (const id of streamIds) next.delete(id)
      for (const item of results) next.set(item.streamId, item)
      nowNextByStream.value = next
    } catch {
      // Keep whatever we had.
    }
  }

  function nowNextFor(streamId: number | null | undefined): EpgNowNext | null {
    return streamId == null ? null : nowNextByStream.value.get(streamId) ?? null
  }

  return { nowNextByStream, loadNowNext, nowNextFor }
})
