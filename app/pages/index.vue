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

// Colourful category tiles, like the Apple TV app's. Literal classes for Tailwind's scanner.
const browseTiles = [
  { label: 'Live TV', description: 'All channels', icon: 'i-lucide-tv', to: '/live', tint: 'from-rose-500 to-red-600' },
  { label: 'TV Guide', description: 'What\'s on later', icon: 'i-lucide-calendar-range', to: '/live/guide', tint: 'from-amber-400 to-orange-500' },
  { label: 'Movies', description: 'On demand', icon: 'i-lucide-film', to: '/movies', tint: 'from-sky-400 to-blue-600' },
  { label: 'Series', description: 'Shows & episodes', icon: 'i-lucide-clapperboard', to: '/series', tint: 'from-violet-400 to-purple-600' }
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
  <div class="flex flex-1 flex-col gap-6">
    <PageTitle title="Home" />

    <div v-if="!ready" class="flex flex-col gap-6" aria-busy="true">
      <USkeleton class="h-56 w-full rounded-3xl" />
      <div class="flex gap-4 overflow-hidden">
        <USkeleton v-for="i in 5" :key="i" class="aspect-video w-44 shrink-0 rounded-xl sm:w-56" />
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

    <div v-else class="flex flex-col gap-10">
      <HomeContinueWatching v-if="resumeChannel" :channel="resumeChannel" :now="clock" />

      <section
        v-else
        aria-label="Start watching"
        class="relative isolate flex flex-col items-start gap-3 overflow-hidden rounded-3xl bg-elevated p-8 shadow-card"
      >
        <div class="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
        <span class="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-card">
          <UIcon name="i-lucide-tv" class="size-7" />
        </span>
        <h2 class="text-2xl font-bold tracking-tight text-highlighted">
          Start watching live TV
        </h2>
        <p class="max-w-md text-[15px] text-muted">
          Browse channels by category, star your favorites, and the channel you watch last will be waiting here.
        </p>
        <UButton to="/live" icon="i-lucide-play" size="xl" class="mt-2 px-6">
          Browse Channels
        </UButton>
      </section>

      <HomeChannelStrip
        v-if="favoriteStrip.length"
        title="Favorite Channels"
        :channels="favoriteStrip"
        :now="clock"
        see-all-to="/favorites"
      />

      <HomeChannelStrip
        v-if="recentStrip.length"
        title="Recently Watched"
        :channels="recentStrip"
        :now="clock"
        see-all-to="/recently-watched"
      />

      <section aria-labelledby="browse-heading" class="flex flex-col gap-3">
        <h2 id="browse-heading" class="text-xl font-bold tracking-tight text-highlighted">
          Browse
        </h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <NuxtLink
            v-for="tile in browseTiles"
            :key="tile.to"
            :to="tile.to"
            class="group relative flex aspect-[16/9] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-card outline-none transition duration-300 ease-spring hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-(--ui-bg) active:scale-[0.98] sm:aspect-[2/1]"
            :class="tile.tint"
          >
            <UIcon :name="tile.icon" class="size-7 opacity-90" />
            <span class="flex flex-col">
              <span class="text-[17px] font-semibold tracking-tight">{{ tile.label }}</span>
              <span class="text-[13px] text-white/80">{{ tile.description }}</span>
            </span>
            <UIcon name="i-lucide-arrow-up-right" class="absolute top-4 right-4 size-5 opacity-0 transition group-hover:opacity-80" />
          </NuxtLink>
        </div>
      </section>

      <div class="grid items-start gap-6 md:grid-cols-2">
        <HomeAccountCard :profile-name="activeProfile.name" />

        <GroupedSection
          v-if="guideIsEmpty"
          title="TV Guide"
          footer="Your provider doesn't publish programme listings. Add a guide source to see what's on now and next."
        >
          <GroupedRow
            label="Set up the TV guide"
            icon="i-lucide-calendar-x"
            icon-class="bg-gradient-to-br from-amber-400 to-orange-500"
            to="/settings"
          />
        </GroupedSection>
      </div>
    </div>
  </div>
</template>
