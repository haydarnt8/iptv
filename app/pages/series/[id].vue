<script setup lang="ts">
import type { CastMediaRequest } from '#shared/types/cast'
import type { SeriesEpisode } from '#shared/types/xtream'

const route = useRoute()
const seriesId = route.params.id as string

// Fixed row: one-line title + up to two lines of plot.
const episodeHeight = () => 84
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

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <UButton to="/series" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" class="self-start">
      Back to Series
    </UButton>

    <div v-if="pending" class="flex flex-col gap-4">
      <USkeleton class="aspect-video w-full" />
      <USkeleton class="h-6 w-1/2" />
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
            size="sm"
            :disabled="!previousEpisode"
            @click="previousEpisode && playEpisode(previousEpisode.id)"
          >
            Previous episode
          </UButton>
          <span class="text-sm text-muted">
            S{{ selectedEpisode.seasonNumber }}E{{ selectedEpisode.episodeNum }} - {{ selectedEpisode.title }}
          </span>
          <UButton
            icon="i-lucide-skip-forward"
            trailing
            variant="soft"
            color="neutral"
            size="sm"
            :disabled="!nextEpisode"
            @click="nextEpisode && playEpisode(nextEpisode.id)"
          >
            Next episode
          </UButton>
        </div>
      </template>

      <div class="flex flex-col gap-3 sm:flex-row">
        <img
          v-if="series.info.cover"
          :src="series.info.cover"
          alt=""
          class="w-32 shrink-0 rounded-lg object-cover sm:w-40"
        >
        <div class="flex flex-col gap-2">
          <h1 class="text-xl font-semibold">
            {{ series.info.name }}
          </h1>
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span v-if="series.info.rating">★ {{ series.info.rating }}</span>
            <span v-if="series.info.releaseDate">{{ series.info.releaseDate }}</span>
          </div>
          <p v-if="series.info.plot" class="text-sm">
            {{ series.info.plot }}
          </p>
        </div>
      </div>

      <EmptyState
        v-if="sortedEpisodes.length === 0"
        icon="i-lucide-clapperboard"
        title="No episodes"
        description="Your IPTV service didn't return any episodes for this series."
      />

      <template v-else>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <UButton
            v-for="seasonNumber in availableSeasonNumbers"
            :key="seasonNumber"
            size="sm"
            :variant="selectedSeasonNumber === seasonNumber ? 'solid' : 'soft'"
            @click="selectedSeasonNumber = seasonNumber"
          >
            {{ seasonLabel(seasonNumber) }}
          </UButton>
        </div>

        <!-- Long-running shows reach 1,000+ episodes in a single season. -->
        <VirtualGrid
          :items="episodesInSelectedSeason"
          :item-key="episodeKey"
          :min-column-width="Number.MAX_SAFE_INTEGER"
          :item-height="episodeHeight"
          :gap="8"
        >
          <template #default="{ item: episode }">
            <button
              type="button"
              class="flex h-full w-full items-center gap-3 overflow-hidden rounded-lg border bg-default px-4 text-left transition hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
              :class="episode.id === selectedEpisodeId ? 'border-primary ring-2 ring-primary' : 'border-default'"
              :aria-pressed="episode.id === selectedEpisodeId"
              @click="playEpisode(episode.id)"
            >
              <UIcon
                :name="episode.id === selectedEpisodeId ? 'i-lucide-play-circle' : 'i-lucide-circle-play'"
                class="size-6 shrink-0 text-muted"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  {{ episode.episodeNum }}. {{ episode.title }}
                </p>
                <p v-if="episode.plot" class="line-clamp-2 text-sm text-muted">
                  {{ episode.plot }}
                </p>
              </div>
              <span v-if="formatDuration(episode.durationSecs)" class="shrink-0 text-sm text-muted">
                {{ formatDuration(episode.durationSecs) }}
              </span>
            </button>
          </template>
        </VirtualGrid>
      </template>
    </template>
  </div>
</template>
