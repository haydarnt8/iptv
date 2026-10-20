<script setup lang="ts">
import type { CastMediaRequest } from '#shared/types/cast'

const route = useRoute()
const movieId = route.params.id as string

const xtream = useXtreamApi()

const { data: movie, pending, error, refresh } = await useAsyncData(
  `movie-${movieId}`,
  () => xtream.getVodDetails(movieId)
)

useSeoMeta({ title: () => movie.value ? `${movie.value.name} - IPTV` : 'Movie - IPTV' })

// Container support is decided by `isContainerSupported` (see utils/playback):
// avi/wmv never play, MKV depends on the browser engine. Anything else is
// worth a playback attempt; the player's own error state catches failures.
const containerExtension = computed(() => normalizeContainerExtension(movie.value?.containerExtension))
const isSupported = computed(() => isContainerSupported(movie.value?.containerExtension))

const streamUrl = computed(() =>
  movie.value ? `/api/stream/movie/${movie.value.streamId}?ext=${containerExtension.value}` : null
)
const playerFormat = computed(() => getPlayerFormat(movie.value?.containerExtension))

// Nothing streams until the user presses Play: accounts often allow a single
// connection, and just opening a movie page shouldn't cut off another device.
const started = ref(false)
const playerSrc = computed(() => (started.value ? streamUrl.value : null))

const castMedia = computed<CastMediaRequest | null>(() =>
  movie.value
    ? { kind: 'movie', id: String(movie.value.streamId), ext: containerExtension.value, title: movie.value.name, image: movie.value.cover }
    : null
)

const metadata = computed(() => {
  const value = movie.value
  if (!value) return []
  return [value.releaseDate?.slice(0, 4), value.genre, formatDuration(value.durationSecs)].filter((part): part is string => !!part)
})

function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-6">
    <UButton to="/movies" icon="i-lucide-chevron-left" variant="ghost" color="neutral" class="-ml-2 self-start">
      Movies
    </UButton>

    <div v-if="pending" class="flex flex-col gap-6">
      <USkeleton class="aspect-video w-full rounded-2xl" />
      <USkeleton class="h-8 w-1/2" />
      <USkeleton class="h-20 w-full" />
    </div>

    <div v-else-if="error" class="flex flex-col items-start gap-2">
      <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="getErrorMessage(error)" />
      <UButton size="sm" variant="soft" @click="refresh()">
        Retry
      </UButton>
    </div>

    <template v-else-if="movie">
      <Player v-if="isSupported" :src="playerSrc" :format="playerFormat" :title="movie.name" :cast-media="castMedia">
        <!-- Before playback: an Apple TV–style hero over the blurred artwork. -->
        <template #idle>
          <img
            v-if="movie.cover"
            :src="movie.cover"
            alt=""
            class="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
          <div class="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-5 text-left sm:p-8">
            <h1 class="line-clamp-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">
              {{ movie.name }}
            </h1>
            <p v-if="metadata.length" class="text-[13px] text-white/75 sm:text-[15px]">
              {{ metadata.join(' · ') }}
            </p>
            <UButton icon="i-lucide-play" size="xl" class="mt-2 px-7" :aria-label="`Play ${movie.name}`" @click="started = true">
              Play
            </UButton>
          </div>
        </template>
      </Player>
      <UAlert
        v-else
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="This format isn't supported for in-browser playback"
        :description="`This movie is provided as .${containerExtension}, which browsers can't play directly.`"
        :actions="[{ label: 'Open stream link', to: streamUrl ?? undefined, target: '_blank', variant: 'soft', size: 'sm' }]"
      />

      <section class="flex flex-col gap-6 sm:flex-row sm:items-start">
        <img
          v-if="movie.cover"
          :src="movie.cover"
          alt=""
          class="hidden w-44 shrink-0 rounded-lg shadow-card ring-[0.5px] ring-default sm:block"
        >
        <div class="flex min-w-0 flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <h2 class="text-2xl font-bold tracking-tight text-highlighted">
              {{ movie.name }}
            </h2>
            <div class="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span v-if="movie.rating" class="flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 font-medium text-default">
                <UIcon name="i-lucide-star" class="size-3.5 text-accent" />
                {{ movie.rating.toFixed(1) }}
              </span>
              <span v-for="part in metadata" :key="part" class="rounded-full bg-elevated px-2 py-0.5">{{ part }}</span>
            </div>
          </div>
          <p v-if="movie.plot" class="max-w-3xl text-[15px] leading-relaxed text-default">
            {{ movie.plot }}
          </p>
          <GroupedSection v-if="movie.director || movie.cast" title="Cast & Crew" class="max-w-3xl">
            <GroupedRow v-if="movie.director" label="Director" :detail="movie.director" />
            <GroupedRow v-if="movie.cast" label="Cast" :detail="movie.cast" />
          </GroupedSection>
        </div>
      </section>
    </template>
  </div>
</template>
