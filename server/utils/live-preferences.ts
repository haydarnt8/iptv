import { z } from 'zod'
import type { LivePreferences, LivePreferencesPatch } from '#shared/types/preferences'

export const MAX_FAVORITE_CHANNELS = 1000
export const MAX_RECENT_CHANNELS = 20

export const liveStreamSchema = z.object({
  streamId: z.number().int().nonnegative(),
  name: z.string().max(300),
  categoryId: z.string().max(100).nullable(),
  streamIcon: z.string().max(2000).nullable(),
  epgChannelId: z.string().max(300).nullable()
})

export const livePreferencesPatchSchema = z.object({
  favorites: z.array(liveStreamSchema).max(MAX_FAVORITE_CHANNELS, `At most ${MAX_FAVORITE_CHANNELS} favorite channels.`).optional(),
  lastCategoryId: z.string().max(100).nullable().optional(),
  watched: liveStreamSchema.optional()
})

function storage() {
  return useStorage('preferences')
}

function emptyPreferences(): LivePreferences {
  return { favorites: [], recentChannels: [], lastCategoryId: null }
}

export async function getLivePreferences(profileId: string): Promise<LivePreferences> {
  const stored = await storage().getItem<LivePreferences>(`live:${profileId}`)
  return { ...emptyPreferences(), ...stored }
}

// Read-modify-write: serialize per profile so two quick PATCHes (e.g. a category change and a
// "watched" ping) can't overwrite each other.
const queues = new Map<string, Promise<unknown>>()

export function updateLivePreferences(profileId: string, patch: LivePreferencesPatch): Promise<LivePreferences> {
  const previous = queues.get(profileId) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(async () => {
    const current = await getLivePreferences(profileId)
    const updated: LivePreferences = { ...current }

    if (patch.favorites) {
      const seen = new Set<number>()
      updated.favorites = patch.favorites.filter((channel) => {
        if (seen.has(channel.streamId)) return false
        seen.add(channel.streamId)
        return true
      })
    }
    if (patch.lastCategoryId !== undefined) updated.lastCategoryId = patch.lastCategoryId
    if (patch.watched) {
      const watched = patch.watched
      updated.recentChannels = [watched, ...current.recentChannels.filter(channel => channel.streamId !== watched.streamId)]
        .slice(0, MAX_RECENT_CHANNELS)
    }

    await storage().setItem(`live:${profileId}`, updated)
    return updated
  })
  queues.set(profileId, next)
  void next.finally(() => {
    if (queues.get(profileId) === next) queues.delete(profileId)
  })
  return next
}

export async function deleteLivePreferences(profileId: string): Promise<void> {
  await storage().removeItem(`live:${profileId}`)
}
