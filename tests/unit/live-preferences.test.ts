import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveStream } from '#shared/types/xtream'
import { getLivePreferences, MAX_RECENT_CHANNELS, updateLivePreferences } from '../../server/utils/live-preferences'

const channel = (streamId: number): LiveStream => ({ streamId, name: `Channel ${streamId}`, categoryId: null, streamIcon: null, epgChannelId: null })

describe('Live TV preferences', () => {
  beforeEach(() => {
    const items = new Map<string, unknown>()
    vi.stubGlobal('useStorage', () => ({
      getItem: async (key: string) => structuredClone(items.get(key) ?? null),
      setItem: async (key: string, value: unknown) => {
        items.set(key, structuredClone(value))
      }
    }))
  })

  it('starts empty', async () => {
    expect(await getLivePreferences('p')).toEqual({ favorites: [], recentChannels: [], lastCategoryId: null })
  })

  it('de-duplicates favorites', async () => {
    const updated = await updateLivePreferences('p', { favorites: [channel(1), channel(2), channel(1)] })
    expect(updated.favorites.map(c => c.streamId)).toEqual([1, 2])
  })

  it('moves a watched channel to the front and caps the history', async () => {
    for (let id = 1; id <= MAX_RECENT_CHANNELS + 5; id++) await updateLivePreferences('p', { watched: channel(id) })
    const updated = await updateLivePreferences('p', { watched: channel(10) })
    expect(updated.recentChannels).toHaveLength(MAX_RECENT_CHANNELS)
    expect(updated.recentChannels[0]?.streamId).toBe(10)
    expect(updated.recentChannels.filter(c => c.streamId === 10)).toHaveLength(1)
  })

  it('applies concurrent updates in order without losing any', async () => {
    await Promise.all([
      updateLivePreferences('p', { lastCategoryId: '5' }),
      updateLivePreferences('p', { watched: channel(3) }),
      updateLivePreferences('p', { favorites: [channel(4)] })
    ])
    expect(await getLivePreferences('p')).toMatchObject({
      lastCategoryId: '5',
      recentChannels: [{ streamId: 3 }],
      favorites: [{ streamId: 4 }]
    })
  })
})
