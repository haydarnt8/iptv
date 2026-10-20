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

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <UButton to="/movies" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" class="self-start">
      Back to Movies
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

    <template v-else-if="movie">
      <Player v-if="isSupported" :src="playerSrc" :format="playerFormat" :title="movie.name" :cast-media="castMedia">
        <template #idle>
          <img
            v-if="movie.cover"
            :src="movie.cover"
            alt=""
            class="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-md"
          >
          <div class="relative flex flex-col items-center gap-3">
            <UButton
              icon="i-lucide-play"
              size="xl"
              class="rounded-full p-4"
              :aria-label="`Play ${movie.name}`"
              @click="started = true"
            />
            <p class="text-sm font-medium text-white drop-shadow">
              Play{{ formatDuration(movie.durationSecs) ? ` · ${formatDuration(movie.durationSecs)}` : '' }}
            </p>
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

      <div class="flex flex-col gap-3 sm:flex-row">
        <img
          v-if="movie.cover"
          :src="movie.cover"
          alt=""
          class="w-32 shrink-0 rounded-lg object-cover sm:w-40"
        >
        <div class="flex flex-col gap-2">
          <h1 class="text-xl font-semibold">
            {{ movie.name }}
          </h1>
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span v-if="movie.rating">★ {{ movie.rating }}</span>
            <span v-if="movie.releaseDate">{{ movie.releaseDate }}</span>
            <span v-if="formatDuration(movie.durationSecs)">{{ formatDuration(movie.durationSecs) }}</span>
            <span v-if="movie.genre">{{ movie.genre }}</span>
          </div>
          <p v-if="movie.plot" class="text-sm">
            {{ movie.plot }}
          </p>
          <p v-if="movie.director" class="text-sm text-muted">
            <span class="font-medium">Director:</span> {{ movie.director }}
          </p>
          <p v-if="movie.cast" class="text-sm text-muted">
            <span class="font-medium">Cast:</span> {{ movie.cast }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
