<script setup lang="ts">
import type { SearchResults } from '#shared/types/search'
import type { LiveStream } from '#shared/types/xtream'

useSeoMeta({ title: 'Search - IPTV' })

const route = useRoute()
const router = useRouter()
const xtream = useXtreamApi()
const live = useLiveTvStore()

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250
// After this long the first search is probably building the catalogue index.
const SLOW_SEARCH_MS = 1500

const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const results = shallowRef<SearchResults | null>(null)
const loading = ref(false)
const slow = ref(false)
const error = ref<string | null>(null)
const inputRef = useTemplateRef<{ inputRef: HTMLInputElement | null }>('input')

const trimmed = computed(() => query.value.trim())
const hasResults = computed(() => {
  const value = results.value
  return !!value && (value.live.length > 0 || value.movies.length > 0 || value.series.length > 0)
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let slowTimer: ReturnType<typeof setTimeout> | null = null
let controller: AbortController | null = null

async function runSearch(text: string) {
  controller?.abort()
  if (slowTimer) clearTimeout(slowTimer)
  if (text.length < MIN_QUERY_LENGTH) {
    results.value = null
    loading.value = false
    error.value = null
    return
  }

  const current = new AbortController()
  controller = current
  loading.value = true
  slow.value = false
  error.value = null
  slowTimer = setTimeout(() => {
    slow.value = true
  }, SLOW_SEARCH_MS)

  try {
    results.value = await xtream.search(text, current.signal)
  } catch (caught) {
    if (!current.signal.aborted) error.value = getErrorMessage(caught)
  } finally {
    if (controller === current) {
      loading.value = false
      slow.value = false
      if (slowTimer) clearTimeout(slowTimer)
    }
  }
}

// Debounced, and mirrored into the URL so Back returns to the same results.
watch(trimmed, (text) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    router.replace({ query: text ? { q: text } : {} })
    runSearch(text)
  }, DEBOUNCE_MS)
})

function playChannel(channel: LiveStream) {
  live.playChannel(channel, results.value?.live ?? [channel])
  navigateTo('/live')
}

function moreLabel(shown: number, total: number) {
  return total > shown ? `Showing ${shown} of ${total.toLocaleString()}` : undefined
}

onMounted(() => {
  xtream.warmSearch().catch(() => {})
  inputRef.value?.inputRef?.focus()
  if (trimmed.value) runSearch(trimmed.value)
})

onBeforeUnmount(() => {
  controller?.abort()
  if (debounceTimer) clearTimeout(debounceTimer)
  if (slowTimer) clearTimeout(slowTimer)
})
</script>

<template>
  <div class="flex flex-1 flex-col gap-6">
    <PageTitle title="Search" />

    <UInput
      ref="input"
      v-model="query"
      icon="i-lucide-search"
      size="xl"
      placeholder="Channels, movies and series"
      aria-label="Search channels, movies and series"
      class="w-full max-w-2xl"
      :loading="loading"
      autocomplete="off"
      enterkeyhint="search"
    >
      <template v-if="query" #trailing>
        <UButton
          icon="i-lucide-circle-x"
          variant="link"
          color="neutral"
          size="sm"
          aria-label="Clear search"
          class="text-dimmed"
          @click="query = ''"
        />
      </template>
    </UInput>

    <p v-if="loading && slow" class="flex items-center gap-2 text-[15px] text-muted" role="status">
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
      Preparing your catalogue for searching… the first search takes a little while.
    </p>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />

    <EmptyState
      v-if="trimmed.length < MIN_QUERY_LENGTH"
      icon="i-lucide-search"
      title="Search Everything"
      description="Find channels, movies and series across your whole IPTV service."
    />

    <EmptyState
      v-else-if="results && !hasResults && !loading"
      icon="i-lucide-search-x"
      :title="`No Results for “${results.query}”`"
      description="Check the spelling or try a new search."
    />

    <template v-else-if="results && hasResults">
      <GroupedSection
        v-if="results.live.length"
        title="Channels"
        :footer="moreLabel(results.live.length, results.totals.live)"
        class="max-w-2xl"
      >
        <button
          v-for="channel in results.live"
          :key="channel.streamId"
          type="button"
          class="flex min-h-14 items-center gap-3 px-4 py-2 text-left outline-none transition hover:bg-accented/50 focus-visible:bg-accented/50 active:bg-accented"
          @click="playChannel(channel)"
        >
          <LiveChannelLogo :src="channel.streamIcon" class="size-10 rounded-lg bg-(--logo-tile)" />
          <span class="min-w-0 flex-1 truncate text-[15px] text-highlighted">{{ channel.name }}</span>
          <UIcon name="i-lucide-play" class="size-4 shrink-0 text-dimmed" />
        </button>
      </GroupedSection>

      <section v-if="results.movies.length" aria-labelledby="movie-results" class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between gap-2">
          <h2 id="movie-results" class="text-xl font-bold tracking-tight text-highlighted">
            Movies
          </h2>
          <span v-if="moreLabel(results.movies.length, results.totals.movies)" class="text-[13px] text-muted">
            {{ moreLabel(results.movies.length, results.totals.movies) }}
          </span>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-5">
          <MediaPosterCard
            v-for="movie in results.movies"
            :key="movie.streamId"
            :to="`/movies/${movie.streamId}`"
            :title="movie.name"
            :image="movie.streamIcon"
            :rating="movie.rating"
            icon="i-lucide-film"
          />
        </div>
      </section>

      <section v-if="results.series.length" aria-labelledby="series-results" class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between gap-2">
          <h2 id="series-results" class="text-xl font-bold tracking-tight text-highlighted">
            Series
          </h2>
          <span v-if="moreLabel(results.series.length, results.totals.series)" class="text-[13px] text-muted">
            {{ moreLabel(results.series.length, results.totals.series) }}
          </span>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-5">
          <MediaPosterCard
            v-for="show in results.series"
            :key="show.seriesId"
            :to="`/series/${show.seriesId}`"
            :title="show.name"
            :image="show.cover"
            :rating="show.rating"
            icon="i-lucide-clapperboard"
          />
        </div>
      </section>
    </template>
  </div>
</template>
