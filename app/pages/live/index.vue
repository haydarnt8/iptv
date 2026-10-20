<script setup lang="ts">
import type { CastMediaRequest } from '#shared/types/cast'
import type { LiveStream } from '#shared/types/xtream'
import { FAVORITES_CATEGORY_ID } from '~/stores/liveTv'

useSeoMeta({ title: 'Live TV - IPTV' })

const store = useLiveTvStore()
const {
  categories,
  categoriesEmpty,
  categoriesLoading,
  categoriesLoaded,
  categoriesError,
  selectedCategoryId,
  selectedCategory,
  items,
  filteredItems,
  itemsLoading,
  itemsError,
  searchQuery,
  selectedChannel,
  previousChannel,
  resumeChannel
} = storeToRefs(store)

const epg = useEpgStore()
const clock = useClock(30_000)
const route = useRoute()
const router = useRouter()

const playerRef = useTemplateRef<{ focus: () => void }>('player')
const playerWrapperRef = useTemplateRef<HTMLElement>('playerWrapper')
const gridRef = useTemplateRef<{ scrollToItem: (index: number, align?: 'auto' | 'center') => void }>('grid')

const categoryIcons = { [FAVORITES_CATEGORY_ID]: 'i-lucide-star' }
const isFavoritesCategory = computed(() => selectedCategoryId.value === FAVORITES_CATEGORY_ID)

const playerSrc = computed(() =>
  selectedChannel.value ? `/api/stream/live/${selectedChannel.value.streamId}` : null
)
const nowPlaying = computed(() => epg.nowNextFor(selectedChannel.value?.streamId)?.now ?? null)
const castMedia = computed<CastMediaRequest | null>(() => {
  const channel = selectedChannel.value
  if (!channel) return null
  return {
    kind: 'live',
    id: String(channel.streamId),
    title: channel.name,
    subtitle: nowPlaying.value?.title,
    image: channel.streamIcon
  }
})

const playerSubtitle = computed(() => {
  const programme = nowPlaying.value
  return programme ? `${programme.title} · ${formatClock(programme.start)}–${formatClock(programme.stop)}` : undefined
})

onMounted(async () => {
  await store.init()
  playFromQuery()
})

/** Deep link from Home/Favorites: /live?channel=<streamId>. */
function playFromQuery() {
  const raw = route.query.channel
  if (raw === undefined) return
  const channel = store.findKnownChannel(Number(raw))
  if (channel) store.playChannel(channel)
  router.replace({ query: { ...route.query, channel: undefined } })
}

function play(channel: LiveStream) {
  store.playChannel(channel, filteredItems.value)
  // So arrow keys zap straight away.
  playerRef.value?.focus()
}

// --- Keep the playing channel visible in the list while zapping ---

const HEADER_HEIGHT = 56
const MOBILE_NAV_HEIGHT = 64

function visibleListBounds() {
  const wrapper = playerWrapperRef.value
  // On phones the player sticks to the top and covers part of the list.
  const playerBottom = wrapper && getComputedStyle(wrapper).position === 'sticky' ? wrapper.getBoundingClientRect().bottom : 0
  const isDesktop = window.matchMedia('(min-width: 768px)').matches
  return {
    top: Math.max(HEADER_HEIGHT, playerBottom),
    bottom: window.innerHeight - (isDesktop ? 0 : MOBILE_NAV_HEIGHT)
  }
}

function revealChannel(streamId: number) {
  const index = filteredItems.value.findIndex(channel => channel.streamId === streamId)
  if (index < 0) return
  const row = document.querySelector(`[data-stream-id="${streamId}"]`)
  if (row) {
    const rect = row.getBoundingClientRect()
    const bounds = visibleListBounds()
    if (rect.top >= bounds.top && rect.bottom <= bounds.bottom) return
  }
  gridRef.value?.scrollToItem(index, 'center')
}

watch(selectedChannel, async (channel) => {
  if (!channel) return
  await nextTick()
  revealChannel(channel.streamId)
})

// Up/Down moves between channel rows (Enter plays).
function onListKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const current = (event.target as HTMLElement).closest<HTMLElement>('[data-stream-id]')
  if (!current) return
  event.preventDefault()
  const index = filteredItems.value.findIndex(channel => channel.streamId === Number(current.dataset.streamId))
  const next = filteredItems.value[index + (event.key === 'ArrowDown' ? 1 : -1)]
  if (!next) return
  revealChannel(next.streamId)
  nextTick(() => {
    document.querySelector<HTMLElement>(`[data-stream-id="${next.streamId}"] [data-channel-button]`)?.focus({ preventScroll: true })
  })
}

// --- Hardware keys and OS media controls (incl. the picture-in-picture window) ---

function onWindowKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (event.key === 'ChannelUp') store.zap(-1)
  else if (event.key === 'ChannelDown') store.zap(1)
}

function setMediaSessionHandlers(enabled: boolean) {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.setActionHandler('previoustrack', enabled ? () => store.zap(-1) : null)
    navigator.mediaSession.setActionHandler('nexttrack', enabled ? () => store.zap(1) : null)
  } catch {
    // Older browsers reject unknown actions.
  }
}

watch([selectedChannel, nowPlaying], ([channel, programme]) => {
  if (!import.meta.client || !('mediaSession' in navigator)) return
  navigator.mediaSession.metadata = channel
    ? new MediaMetadata({
        title: programme?.title ?? channel.name,
        artist: programme ? channel.name : 'Live TV',
        artwork: channel.streamIcon ? [{ src: channel.streamIcon }] : []
      })
    : null
})

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown)
  setMediaSessionHandlers(true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  setMediaSessionHandlers(false)
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
})

// --- Programme guide for the visible channels ---

// The visible category plus the playing channel (which may belong to another
// category), refreshed every minute while open.
function loadGuide() {
  const ids = new Set(items.value.map(channel => channel.streamId))
  if (selectedChannel.value) ids.add(selectedChannel.value.streamId)
  epg.loadNowNext([...ids])
}

watch([items, selectedChannel], loadGuide)

let guideTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  // The store outlives the page, so the list and channel may already be set (no change to watch).
  loadGuide()
  guideTimer = setInterval(loadGuide, 60_000)
})
onBeforeUnmount(() => {
  if (guideTimer) clearInterval(guideTimer)
})

const CHANNEL_ROW_HEIGHT = 64
const channelHeight = () => CHANNEL_ROW_HEIGHT
const channelKey = (channel: LiveStream) => channel.streamId
// One column at any width.
const SINGLE_COLUMN = Number.MAX_SAFE_INTEGER
</script>

<template>
  <div class="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-6">
    <h1 class="sr-only">
      Live TV
    </h1>

    <!-- `contents` on phones so the player can stick for the whole page; a sticky column on desktop. -->
    <div class="contents lg:sticky lg:top-[4.5rem] lg:flex lg:max-h-[calc(100dvh-5.5rem)] lg:flex-col lg:gap-3 lg:overflow-y-auto">
      <div
        ref="playerWrapper"
        :class="selectedChannel ? 'sticky top-14 z-20 -mx-4 -mt-4 bg-default px-4 pt-4 pb-1 sm:mx-0 sm:px-0 lg:static lg:m-0 lg:p-0' : ''"
      >
        <Player
          ref="player"
          :src="playerSrc"
          format="hls"
          zapping
          :has-last="!!previousChannel"
          :title="selectedChannel?.name"
          :subtitle="playerSubtitle"
          :image="selectedChannel?.streamIcon"
          :cast-media="castMedia"
          @zap="store.zap"
          @last="store.playPrevious"
        >
          <template #idle>
            <template v-if="resumeChannel">
              <LiveChannelLogo :src="resumeChannel.streamIcon" class="size-14" />
              <p class="text-sm text-muted">
                Pick up where you left off
              </p>
              <UButton icon="i-lucide-play" size="lg" class="max-w-full" @click="store.playChannel(resumeChannel)">
                <span class="truncate">Watch {{ resumeChannel.name }}</span>
              </UButton>
            </template>
            <template v-else>
              <UIcon name="i-lucide-tv" class="size-10" />
              <p class="text-sm">
                Pick a channel to start watching
              </p>
            </template>
          </template>
          <template v-if="selectedChannel" #actions>
            <LiveFavoriteButton :channel="selectedChannel" appearance="overlay" />
          </template>
        </Player>
      </div>

      <EpgNow
        v-if="selectedChannel"
        :stream-id="selectedChannel.streamId"
        :channel-name="selectedChannel.name"
      >
        <template #actions>
          <LiveFavoriteButton :channel="selectedChannel" />
        </template>
      </EpgNow>

      <p class="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dimmed lg:flex">
        <span><UKbd value="↑" /> <UKbd value="↓" /> channel</span>
        <span><UKbd value="L" /> last channel</span>
        <span><UKbd value="F" /> fullscreen</span>
        <span><UKbd value="M" /> mute</span>
        <span><UKbd value="+" /> <UKbd value="−" /> volume</span>
      </p>
    </div>

    <section aria-label="Channels" class="flex min-w-0 flex-col gap-3">
      <USkeleton v-if="categoriesLoading" class="h-9 w-full" />

      <div v-else-if="categoriesError" class="flex flex-col items-start gap-2">
        <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="categoriesError" />
        <UButton size="sm" variant="soft" @click="store.retry()">
          Retry
        </UButton>
      </div>

      <EmptyState
        v-else-if="categoriesEmpty"
        icon="i-lucide-tv"
        title="No live channels"
        description="Your IPTV service didn't return any Live TV categories."
      />

      <template v-else-if="categoriesLoaded">
        <div class="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <CategorySelect
            :categories="categories"
            :model-value="selectedCategoryId"
            :icons="categoryIcons"
            class="lg:w-full"
            @update:model-value="store.selectCategory"
          />
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            :placeholder="`Search ${selectedCategory?.categoryName ?? 'this category'}`"
            :disabled="itemsLoading || !!itemsError || items.length === 0"
            :aria-label="`Search ${selectedCategory?.categoryName ?? 'this category'}`"
            class="w-full sm:flex-1 lg:flex-none"
          />
        </div>

        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-muted" aria-live="polite">
            <template v-if="!itemsLoading && !itemsError">
              {{ filteredItems.length.toLocaleString() }} {{ filteredItems.length === 1 ? 'channel' : 'channels' }}
            </template>
          </p>
          <UButton to="/live/guide" size="xs" variant="soft" color="neutral" icon="i-lucide-calendar-range">
            TV Guide
          </UButton>
        </div>

        <div v-if="itemsLoading" class="flex flex-col gap-1">
          <USkeleton v-for="i in 8" :key="i" class="h-15 w-full" />
        </div>

        <div v-else-if="itemsError" class="flex flex-col items-start gap-2">
          <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="itemsError" />
          <UButton size="sm" variant="soft" @click="store.retry()">
            Retry
          </UButton>
        </div>

        <EmptyState
          v-else-if="items.length === 0 && isFavoritesCategory"
          icon="i-lucide-star"
          title="No favorite channels yet"
          description="Tap the star next to a channel to keep it here."
        />

        <EmptyState
          v-else-if="items.length === 0"
          icon="i-lucide-tv"
          title="This category is empty"
          description="Pick another category."
        />

        <EmptyState
          v-else-if="filteredItems.length === 0"
          icon="i-lucide-search-x"
          title="No matching channels"
          description="Try a different search term or category."
        />

        <div v-else @keydown="onListKeydown">
          <VirtualGrid
            ref="grid"
            :items="filteredItems"
            :item-key="channelKey"
            :min-column-width="SINGLE_COLUMN"
            :item-height="channelHeight"
            :gap="4"
          >
            <template #default="{ item: channel }">
              <LiveChannelRow
                :channel="channel"
                :playing="channel.streamId === selectedChannel?.streamId"
                :guide="epg.nowNextFor(channel.streamId)"
                :now="clock"
                @play="play(channel)"
              />
            </template>
          </VirtualGrid>
        </div>
      </template>
    </section>
  </div>
</template>
