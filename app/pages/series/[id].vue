<script setup lang="ts">
import type { CastMediaRequest } from '#shared/types/cast'
import type { SeriesEpisode } from '#shared/types/xtream'

const route = useRoute()
const seriesId = route.params.id as string

// Fixed row: one-line title + up to two lines of plot.
const episodeHeight = () => 88
const episodeKey = (episode: SeriesEpisode) => episode.id

const xtream = useXtreamApi()

const { data: series, pending, error, refresh } = await useAsyncData(
  `series-${seriesId}`,
  () => xtream.getSeriesDetails(seriesId)
)

useSeoMeta({ title: () => series.value ? `${series.value.info.name} - IPTV` : 'Series - IPTV' })

const sortedEpisodes = computed(() =>
  series.value
    ? [...series.value.episodes].sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNum - b.episodeNum)
    : []
)

const availableSeasonNumbers = computed(() =>
  [...new Set(sortedEpisodes.value.map(episode => episode.seasonNumber))].sort((a, b) => a - b)
)

const selectedSeasonNumber = ref<number | null>(null)

watch(availableSeasonNumbers, (seasons) => {
  if (selectedSeasonNumber.value === null && seasons.length > 0) {
    selectedSeasonNumber.value = seasons[0] ?? null
  }
}, { immediate: true })

function seasonLabel(seasonNumber: number): string {
  const meta = series.value?.seasons.find(season => season.seasonNumber === seasonNumber)
  return meta?.name || `Season ${seasonNumber}`
}

const episodesInSelectedSeason = computed(() =>
  sortedEpisodes.value.filter(episode => episode.seasonNumber === selectedSeasonNumber.value)
)

const selectedEpisodeId = ref<string | null>(null)
const selectedEpisode = computed(() =>
  sortedEpisodes.value.find(episode => episode.id === selectedEpisodeId.value) ?? null
)
const selectedEpisodeIndex = computed(() =>
  sortedEpisodes.value.findIndex(episode => episode.id === selectedEpisodeId.value)
)
const previousEpisode = computed(() =>
  selectedEpisodeIndex.value > 0 ? sortedEpisodes.value[selectedEpisodeIndex.value - 1] : null
)
const nextEpisode = computed(() =>
  selectedEpisodeIndex.value >= 0 && selectedEpisodeIndex.value < sortedEpisodes.value.length - 1
    ? sortedEpisodes.value[selectedEpisodeIndex.value + 1]
    : null
)

function playEpisode(episodeId: string) {
  selectedEpisodeId.value = episodeId
  const episode = sortedEpisodes.value.find(e => e.id === episodeId)
  if (episode) selectedSeasonNumber.value = episode.seasonNumber
}

const containerExtension = computed(() => normalizeContainerExtension(selectedEpisode.value?.containerExtension))
const isSupported = computed(() => isContainerSupported(selectedEpisode.value?.containerExtension))
const streamUrl = computed(() =>
  selectedEpisode.value ? `/api/stream/series/${selectedEpisode.value.id}?ext=${containerExtension.value}` : null
)
const playerFormat = computed(() => getPlayerFormat(selectedEpisode.value?.containerExtension))

const castMedia = computed<CastMediaRequest | null>(() => {
  const episode = selectedEpisode.value
  const info = series.value?.info
  if (!episode || !info) return null
  return {
    kind: 'series',
    id: episode.id,
    ext: containerExtension.value,
    title: episode.title,
    subtitle: `${info.name} · S${episode.seasonNumber} E${episode.episodeNum}`,
    image: info.cover
  }
})

const firstEpisodeOfSeason = computed(() => episodesInSelectedSeason.value[0] ?? null)

const metadata = computed(() => {
  const info = series.value?.info
  if (!info) return []
  const seasonCount = availableSeasonNumbers.value.length
  return [
    info.releaseDate?.slice(0, 4),
    seasonCount ? `${seasonCount} ${seasonCount === 1 ? 'season' : 'seasons'}` : null
  ].filter((part): part is string => !!part)
})

function playAndReveal(episodeId: string) {
  playEpisode(episodeId)
  // The player appears at the top of the page.
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-6">
    <UButton to="/series" icon="i-lucide-chevron-left" variant="ghost" color="neutral" class="-ml-2 self-start">
      Series
    </UButton>

    <div v-if="pending" class="flex flex-col gap-6">
      <USkeleton class="h-72 w-full rounded-3xl" />
      <USkeleton class="h-8 w-1/2" />
      <USkeleton class="h-20 w-full" />
    </div>

    <div v-else-if="error" class="flex flex-col items-start gap-2">
      <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="getErrorMessage(error)" />
      <UButton size="sm" variant="soft" @click="refresh()">
        Retry
      </UButton>
    </div>

    <template v-else-if="series">
      <template v-if="selectedEpisode">
        <Player
          v-if="isSupported"
          :src="streamUrl"
          :format="playerFormat"
          :title="selectedEpisode.title"
          :subtitle="`${series.info.name} · Season ${selectedEpisode.seasonNumber}, Episode ${selectedEpisode.episodeNum}`"
          :cast-media="castMedia"
          idle-message="Select an episode to start watching"
        />
        <UAlert
          v-else
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="This format isn't supported for in-browser playback"
          :description="`This episode is provided as .${containerExtension}, which browsers can't play directly.`"
          :actions="[{ label: 'Open stream link', to: streamUrl ?? undefined, target: '_blank', variant: 'soft', size: 'sm' }]"
        />

        <div class="flex items-center justify-between gap-2">
          <UButton
            icon="i-lucide-skip-back"
            variant="soft"
            color="neutral"
            :disabled="!previousEpisode"
            @click="previousEpisode && playEpisode(previousEpisode.id)"
          >
            <span class="hidden sm:inline">Previous</span>
          </UButton>
          <p class="min-w-0 truncate text-center text-[15px] text-muted">
            <span class="font-semibold text-highlighted">S{{ selectedEpisode.seasonNumber }} E{{ selectedEpisode.episodeNum }}</span>
            · {{ selectedEpisode.title }}
          </p>
          <UButton
            icon="i-lucide-skip-forward"
            trailing
            variant="soft"
            color="neutral"
            :disabled="!nextEpisode"
            @click="nextEpisode && playEpisode(nextEpisode.id)"
          >
            <span class="hidden sm:inline">Next</span>
          </UButton>
        </div>
      </template>

      <!-- Apple TV–style hero: the cover, blurred, as ambient background. -->
      <section class="relative isolate overflow-hidden rounded-3xl bg-elevated shadow-card">
        <img
          v-if="series.info.cover"
          :src="series.info.cover"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 -z-10 size-full scale-125 object-cover opacity-40 blur-3xl saturate-150"
        >
        <div class="absolute inset-0 -z-10 bg-gradient-to-r from-elevated via-elevated/80 to-elevated/30" />
        <div class="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-8">
          <img
            v-if="series.info.cover"
            :src="series.info.cover"
            alt=""
            class="w-32 shrink-0 rounded-lg shadow-card ring-[0.5px] ring-default sm:w-48"
          >
          <div class="flex min-w-0 flex-col gap-2">
            <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-4xl">
              {{ series.info.name }}
            </h1>
            <div class="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span v-if="series.info.rating" class="flex items-center gap-1 rounded-full bg-default/60 px-2 py-0.5 font-medium text-default">
                <UIcon name="i-lucide-star" class="size-3.5 text-accent" />
                {{ series.info.rating.toFixed(1) }}
              </span>
              <span v-for="part in metadata" :key="part" class="rounded-full bg-default/60 px-2 py-0.5">{{ part }}</span>
            </div>
            <p v-if="series.info.plot" class="line-clamp-4 max-w-3xl text-[15px] leading-relaxed text-default">
              {{ series.info.plot }}
            </p>
            <UButton
              v-if="firstEpisodeOfSeason && !selectedEpisode"
              icon="i-lucide-play"
              size="xl"
              class="mt-2 self-start px-6"
              @click="playAndReveal(firstEpisodeOfSeason.id)"
            >
              Play S{{ firstEpisodeOfSeason.seasonNumber }} E{{ firstEpisodeOfSeason.episodeNum }}
            </UButton>
          </div>
        </div>
      </section>

      <EmptyState
        v-if="sortedEpisodes.length === 0"
        icon="i-lucide-clapperboard"
        title="No Episodes"
        description="Your IPTV service didn't return any episodes for this series."
      />

      <template v-else>
        <!-- iOS-style segmented control (scrolls when a show has many seasons). -->
        <div class="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <div class="inline-flex gap-1 rounded-full bg-elevated p-1" role="tablist" aria-label="Seasons">
            <button
              v-for="seasonNumber in availableSeasonNumbers"
              :key="seasonNumber"
              type="button"
              role="tab"
              :aria-selected="selectedSeasonNumber === seasonNumber"
              class="shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium whitespace-nowrap outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
              :class="selectedSeasonNumber === seasonNumber ? 'bg-accented text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
              @click="selectedSeasonNumber = seasonNumber"
            >
              {{ seasonLabel(seasonNumber) }}
            </button>
          </div>
        </div>

        <!-- Long-running shows reach 1,000+ episodes in a single season. -->
        <VirtualGrid
          :items="episodesInSelectedSeason"
          :item-key="episodeKey"
          :min-column-width="Number.MAX_SAFE_INTEGER"
          :item-height="episodeHeight"
          :gap="6"
        >
          <template #default="{ item: episode }">
            <button
              type="button"
              class="flex h-full w-full items-center gap-4 overflow-hidden rounded-xl px-4 text-left outline-none transition active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-primary"
              :class="episode.id === selectedEpisodeId ? 'bg-accented/70' : 'bg-elevated hover:bg-accented/50'"
              :aria-current="episode.id === selectedEpisodeId ? 'true' : undefined"
              @click="playAndReveal(episode.id)"
            >
              <span
                class="w-8 shrink-0 text-center text-xl font-semibold tabular-nums"
                :class="episode.id === selectedEpisodeId ? 'text-accent' : 'text-dimmed'"
              >
                <UIcon v-if="episode.id === selectedEpisodeId" name="i-lucide-audio-lines" class="size-5" />
                <template v-else>{{ episode.episodeNum }}</template>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15px] font-medium text-highlighted">{{ episode.title }}</span>
                <span v-if="episode.plot" class="line-clamp-2 text-[13px] leading-snug text-muted">{{ episode.plot }}</span>
              </span>
              <span v-if="formatDuration(episode.durationSecs)" class="shrink-0 text-[13px] text-muted">
                {{ formatDuration(episode.durationSecs) }}
              </span>
            </button>
          </template>
        </VirtualGrid>
      </template>
    </template>
  </div>
</template>
