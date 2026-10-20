<script setup lang="ts">
import type { PlaybackStatus } from '~/composables/useStreamPlayback'

// Everything drawn over the video for a given playback state: idle, loading,
// reconnecting, error, buffering, and the big play button while paused.
defineProps<{
  status: PlaybackStatus
  errorMessage: string
  reconnectAttempt: number
  maxAttempts: number
  isPlaying: boolean
  isBuffering: boolean
  idleMessage: string
  /** Offers "Next channel" when a channel fails. */
  zapping: boolean
}>()

defineEmits<{
  retry: []
  next: []
  togglePlay: []
}>()

defineSlots<{ idle?: () => unknown }>()
</script>

<template>
  <div v-if="status === 'idle'" class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-muted">
    <slot name="idle">
      <UIcon name="i-lucide-tv" class="size-10" />
      <p class="text-sm">
        {{ idleMessage }}
      </p>
    </slot>
  </div>

  <div
    v-else-if="status === 'loading' || status === 'reconnecting'"
    class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white"
    role="status"
  >
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
    <p v-if="status === 'reconnecting'" class="text-sm drop-shadow">
      Reconnecting… (attempt {{ reconnectAttempt }} of {{ maxAttempts }})
    </p>
    <span v-else class="sr-only">Loading</span>
  </div>

  <div
    v-else-if="status === 'error'"
    class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 px-4 text-center text-white sm:gap-3"
    role="alert"
  >
    <UIcon name="i-lucide-circle-alert" class="hidden size-8 sm:block" />
    <p class="max-w-md text-xs sm:text-sm">
      {{ errorMessage }}
    </p>
    <div class="flex gap-2">
      <UButton size="sm" variant="soft" icon="i-lucide-rotate-cw" @click="$emit('retry')">
        Retry
      </UButton>
      <UButton v-if="zapping" size="sm" variant="soft" color="neutral" icon="i-lucide-skip-forward" @click="$emit('next')">
        Next channel
      </UButton>
    </div>
  </div>

  <template v-else-if="status === 'ready'">
    <div
      v-if="isBuffering"
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
      role="status"
    >
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-white" />
      <span class="sr-only">Buffering</span>
    </div>

    <button
      v-if="!isPlaying"
      type="button"
      aria-label="Play"
      class="absolute inset-0 flex items-center justify-center"
      @click="$emit('togglePlay')"
    >
      <span class="flex size-16 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70">
        <UIcon name="i-lucide-play" class="size-8" />
      </span>
    </button>
  </template>
</template>
