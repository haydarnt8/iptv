<script setup lang="ts">
useSeoMeta({ title: 'Home - IPTV' })

const profilesStore = useProfilesStore()
const { profiles, activeProfile } = storeToRefs(profilesStore)
const live = useLiveTvStore()
const { favorites, recentChannels, resumeChannel } = storeToRefs(live)
const epg = useEpgStore()
const epgApi = useEpgApi()
const clock = useClock(30_000)

const ready = ref(false)
const guideIsEmpty = ref(false)

const STRIP_SIZE = 20
const favoriteStrip = computed(() => favorites.value.slice(0, STRIP_SIZE))
// The first recent channel is already the "Continue watching" hero.
const recentStrip = computed(() => recentChannels.value.slice(1, STRIP_SIZE + 1))

const browseTiles = [
  { label: 'Live TV', description: 'All channels', icon: 'i-lucide-tv', to: '/live' },
  { label: 'TV Guide', description: 'What\'s on later', icon: 'i-lucide-calendar-range', to: '/live/guide' },
  { label: 'Movies', description: 'On demand', icon: 'i-lucide-film', to: '/movies' },
  { label: 'Series', description: 'Shows & episodes', icon: 'i-lucide-clapperboard', to: '/series' }
]

function loadGuide() {
  const ids = new Set([...favoriteStrip.value, ...recentChannels.value].map(channel => channel.streamId))
  epg.loadNowNext([...ids])
}

let guideTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await profilesStore.fetchProfiles()
  if (activeProfile.value) {
    await live.loadPreferences()
    loadGuide()
    guideTimer = setInterval(loadGuide, 60_000)
    epgApi.getStatus()
      .then((status) => {
        guideIsEmpty.value = status.state !== 'building' && status.matchedChannels === 0
      })
      .catch(() => {})
  }
  ready.value = true
})

onBeforeUnmount(() => {
  if (guideTimer) clearInterval(guideTimer)
})
</script>

<template>
  <div class="flex flex-1 flex-col">
    <h1 class="sr-only">
      Home
    </h1>

    <div v-if="!ready" class="flex flex-col gap-6" aria-busy="true">
      <USkeleton class="h-44 w-full rounded-xl" />
      <div class="flex gap-3 overflow-hidden">
        <USkeleton v-for="i in 5" :key="i" class="aspect-video w-40 shrink-0 sm:w-48" />
      </div>
    </div>

    <EmptyState
      v-else-if="profiles.length === 0"
      icon="i-lucide-house"
      title="Welcome to IPTV"
      description="Add your IPTV service to start watching Live TV, Movies and Series."
      action-label="Add a profile"
      action-to="/profiles"
    />

    <EmptyState
      v-else-if="!activeProfile"
      icon="i-lucide-user-round"
      title="Choose a profile"
      description="Pick which IPTV service to use."
      action-label="Go to profiles"
      action-to="/profiles"
    />

    <div v-else class="flex flex-col gap-8">
      <HomeContinueWatching v-if="resumeChannel" :channel="resumeChannel" :now="clock" />

      <section
        v-else
        aria-label="Start watching"
        class="flex flex-col items-start gap-3 rounded-xl border border-default bg-gradient-to-br from-primary/20 via-elevated/60 to-default p-6"
      >
        <UIcon name="i-lucide-tv" class="size-10 text-primary" />
        <h2 class="text-xl font-bold text-highlighted">
          Start watching live TV
        </h2>
        <p class="max-w-md text-sm text-muted">
          Browse channels by category, star your favorites, and the channel you watch last will be waiting here.
        </p>
        <UButton to="/live" icon="i-lucide-play" size="lg">
          Browse channels
        </UButton>
      </section>

      <HomeChannelStrip
        v-if="favoriteStrip.length"
        title="Favorite channels"
        :channels="favoriteStrip"
        :now="clock"
        see-all-to="/favorites"
      />

      <HomeChannelStrip
        v-if="recentStrip.length"
        title="Recently watched"
        :channels="recentStrip"
        :now="clock"
        see-all-to="/recently-watched"
      />

      <section aria-label="Browse" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NuxtLink
          v-for="tile in browseTiles"
          :key="tile.to"
          :to="tile.to"
          class="group flex items-center gap-3 rounded-lg border border-default bg-elevated/40 p-3 transition hover:border-primary/50 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary sm:p-4"
        >
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-inverted">
            <UIcon :name="tile.icon" class="size-5" />
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="truncate font-semibold text-highlighted">{{ tile.label }}</span>
            <span class="truncate text-xs text-muted">{{ tile.description }}</span>
          </span>
        </NuxtLink>
      </section>

      <div class="grid gap-4 md:grid-cols-2">
        <HomeAccountCard :profile-name="activeProfile.name" />

        <UCard v-if="guideIsEmpty" :ui="{ body: 'flex flex-col items-start gap-3' }">
          <h2 class="flex items-center gap-2 font-semibold text-highlighted">
            <UIcon name="i-lucide-calendar-x" class="size-4 text-muted" />
            Your TV guide is empty
          </h2>
          <p class="text-sm text-muted">
            Your provider doesn't publish programme listings. Add an XMLTV guide source to see what's on now and next
            for your channels.
          </p>
          <UButton to="/settings" size="sm" variant="soft">
            Set up the TV guide
          </UButton>
        </UCard>
      </div>
    </div>
  </div>
</template>
