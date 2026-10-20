import { defineStore } from 'pinia'
import type { LivePreferencesPatch } from '#shared/types/preferences'
import type { LiveStream } from '#shared/types/xtream'

/** Provider category ids are numeric strings, so this can't collide with one. */
export const FAVORITES_CATEGORY_ID = 'favorites'

// A channel counts as "watched" (and becomes the one to resume) once it has
// played this long, so zapping past a channel doesn't record it.
const WATCHED_AFTER_MS = 5000

export const useLiveTvStore = defineStore('liveTv', () => {
  const xtream = useXtreamApi()
  const preferencesApi = usePreferencesApi()

  // --- Preferences (server-side, per profile) ---

  // Snapshots, replaced never mutated.
  const favorites = shallowRef<LiveStream[]>([])
  const recentChannels = shallowRef<LiveStream[]>([])
  const lastCategoryId = ref<string | null>(null)
  const preferencesLoaded = ref(false)
  let preferencesRequest: Promise<void> | null = null

  const favoriteIds = computed(() => new Set(favorites.value.map(channel => channel.streamId)))
  const resumeChannel = computed(() => recentChannels.value[0] ?? null)

  /** Idempotent. Failures leave defaults in place: preferences are a convenience, not a requirement. */
  function loadPreferences(): Promise<void> {
    preferencesRequest ??= preferencesApi.getLive()
      .then((preferences) => {
        favorites.value = preferences.favorites
        recentChannels.value = preferences.recentChannels
        lastCategoryId.value = preferences.lastCategoryId
        preferencesLoaded.value = true
      })
      .catch(() => {
        preferencesRequest = null
      })
    return preferencesRequest
  }

  function savePreferences(patch: LivePreferencesPatch) {
    return preferencesApi.patchLive(patch)
  }

  function isFavorite(streamId: number) {
    return favoriteIds.value.has(streamId)
  }

  /** Optimistic; reverts and rethrows if the server rejects it. */
  async function toggleFavorite(channel: LiveStream) {
    const previous = favorites.value
    favorites.value = isFavorite(channel.streamId)
      ? previous.filter(item => item.streamId !== channel.streamId)
      : [...previous, channel]
    try {
      await savePreferences({ favorites: favorites.value })
    } catch (error) {
      favorites.value = previous
      throw error
    }
  }

  // --- Catalog ---

  const catalog = createCatalogState<LiveStream>({
    fetchCategories: () => xtream.getLiveCategories(),
    fetchItems: categoryId => xtream.getLiveStreams(categoryId),
    getName: channel => channel.name,
    localCategories: [{ categoryId: FAVORITES_CATEGORY_ID, categoryName: 'Favorites', items: () => favorites.value }]
  })

  async function init() {
    await loadPreferences()
    const fallback = favorites.value.length ? FAVORITES_CATEGORY_ID : null
    await catalog.init(lastCategoryId.value ?? fallback)
  }

  async function selectCategory(categoryId: string) {
    const request = catalog.selectCategory(categoryId)
    if (categoryId !== lastCategoryId.value) {
      lastCategoryId.value = categoryId
      savePreferences({ lastCategoryId: categoryId }).catch(() => {})
    }
    await request
  }

  // --- Playback & zapping ---

  const selectedChannel = shallowRef<LiveStream | null>(null)
  const previousChannel = shallowRef<LiveStream | null>(null)
  // The list the channel was picked from, so zapping stays in it even after
  // browsing to another category.
  const zapSource = shallowRef<LiveStream[] | null>(null)
  let watchedTimer: ReturnType<typeof setTimeout> | null = null

  const zapList = computed<LiveStream[]>(() => {
    const channel = selectedChannel.value
    if (!channel) return []
    const candidates = [zapSource.value, catalog.filteredItems.value, catalog.items.value, favorites.value]
    return candidates.find(list => list?.some(item => item.streamId === channel.streamId)) ?? [channel]
  })

  function markWatched(channel: LiveStream) {
    if (watchedTimer) clearTimeout(watchedTimer)
    watchedTimer = setTimeout(() => {
      if (selectedChannel.value?.streamId !== channel.streamId) return
      recentChannels.value = [channel, ...recentChannels.value.filter(item => item.streamId !== channel.streamId)]
      savePreferences({ watched: channel }).catch(() => {})
    }, WATCHED_AFTER_MS)
  }

  /** `list` is what the user picked from; zapping (up/down) moves through it. */
  function playChannel(channel: LiveStream, list?: LiveStream[]) {
    if (list) zapSource.value = list
    if (selectedChannel.value?.streamId === channel.streamId) return
    previousChannel.value = selectedChannel.value
    selectedChannel.value = channel
    markWatched(channel)
  }

  function zap(direction: 1 | -1) {
    const list = zapList.value
    const current = selectedChannel.value
    if (!current || list.length < 2) return
    const index = list.findIndex(item => item.streamId === current.streamId)
    const next = list[(index + direction + list.length) % list.length]
    if (next) playChannel(next)
  }

  function playPrevious() {
    if (previousChannel.value) playChannel(previousChannel.value)
  }

  /** A channel we already have a snapshot of (for deep links like /live?channel=123). */
  function findKnownChannel(streamId: number): LiveStream | null {
    const lists = [favorites.value, recentChannels.value, catalog.items.value]
    for (const list of lists) {
      const match = list.find(channel => channel.streamId === streamId)
      if (match) return match
    }
    return null
  }

  return {
    ...catalog,
    init,
    selectCategory,
    favorites,
    recentChannels,
    resumeChannel,
    preferencesLoaded,
    loadPreferences,
    isFavorite,
    toggleFavorite,
    selectedChannel,
    previousChannel,
    zapList,
    playChannel,
    zap,
    playPrevious,
    findKnownChannel
  }
})
