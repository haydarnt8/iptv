<script setup lang="ts">
import type { PlaybackStatus } from '~/composables/useStreamPlayback'

// The control bar along the bottom of the player.
const props = defineProps<{
  visible: boolean
  status: PlaybackStatus
  isPlaying: boolean
  isLive: boolean
  currentTime: number
  duration: number
  muted: boolean
  /** Live TV: previous/next channel buttons, plus "last channel" when `hasLast`. */
  zapping: boolean
  hasLast: boolean
  pipSupported: boolean
  isFullscreen: boolean
  /** Show the cast button (devices found and this content can be cast). */
  canCast: boolean
  /** Playing on the TV: the bar becomes a remote (no seek, volume, fullscreen). */
  casting: boolean
}>()

const volume = defineModel<number>('volume', { required: true })

const emit = defineEmits<{
  togglePlay: []
  seek: [time: number]
  zap: [direction: 1 | -1]
  last: []
  toggleMute: []
  togglePip: []
  toggleFullscreen: []
  cast: []
}>()

// While the seek thumb is dragged, show where it is rather than the playing position.
const seekPreview = ref<number | null>(null)
const seekValue = computed({
  get: () => seekPreview.value ?? props.currentTime,
  set: (value: number) => {
    seekPreview.value = value
  }
})

function commitSeek() {
  if (seekPreview.value !== null) emit('seek', seekPreview.value)
  seekPreview.value = null
}

const ready = computed(() => props.status === 'ready')
const canPlayPause = computed(() => ready.value || props.casting)
const buttonClass = 'text-white hover:bg-white/10'
</script>

<template>
  <div
    class="glass-video absolute inset-x-3 bottom-3 z-10 flex flex-col gap-1 rounded-2xl px-2 py-1.5 transition-[opacity,translate] duration-300 ease-spring"
    :class="visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'"
  >
    <div v-if="ready && !isLive && !casting" class="flex items-center gap-2 px-1">
      <span class="w-14 shrink-0 text-right text-xs tabular-nums text-white/90">{{ formatPlaybackTime(seekValue) }}</span>
      <USlider
        v-model="seekValue"
        :min="0"
        :max="duration || 100"
        :step="1"
        size="sm"
        class="flex-1"
        aria-label="Seek"
        @change="commitSeek"
      />
      <span class="w-14 shrink-0 text-xs tabular-nums text-white/90">{{ formatPlaybackTime(duration) }}</span>
    </div>

    <div class="flex items-center gap-1 sm:gap-2">
      <UButton
        v-if="zapping"
        icon="i-lucide-skip-back"
        variant="ghost"
        color="neutral"
        size="sm"
        aria-label="Previous channel"
        title="Previous channel (↑)"
        :class="buttonClass"
        @click="emit('zap', -1)"
      />
      <UButton
        :icon="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
        variant="ghost"
        color="neutral"
        size="sm"
        :disabled="!canPlayPause"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
        :class="buttonClass"
        @click="emit('togglePlay')"
      />
      <UButton
        v-if="zapping"
        icon="i-lucide-skip-forward"
        variant="ghost"
        color="neutral"
        size="sm"
        aria-label="Next channel"
        title="Next channel (↓)"
        :class="buttonClass"
        @click="emit('zap', 1)"
      />

      <UBadge v-if="ready && isLive && !casting" color="error" variant="solid" size="sm" class="mx-1">
        LIVE
      </UBadge>

      <div v-if="!casting" class="flex items-center gap-1.5">
        <UButton
          :icon="muted || volume === 0 ? 'i-lucide-volume-x' : 'i-lucide-volume-2'"
          variant="ghost"
          color="neutral"
          size="sm"
          :aria-label="muted ? 'Unmute' : 'Mute'"
          title="Mute (M)"
          :class="buttonClass"
          @click="emit('toggleMute')"
        />
        <!-- sm:flex, not sm:block: the slider's own layout is flex. -->
        <USlider
          v-model="volume"
          :min="0"
          :max="100"
          size="sm"
          class="hidden w-20 sm:flex"
          aria-label="Volume"
        />
      </div>

      <div class="flex-1" />

      <UButton
        v-if="zapping && hasLast"
        icon="i-lucide-history"
        variant="ghost"
        color="neutral"
        size="sm"
        aria-label="Last channel"
        title="Last channel (L)"
        :class="buttonClass"
        @click="emit('last')"
      />
      <UButton
        v-if="canCast || casting"
        icon="i-lucide-cast"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="casting ? 'Stop casting' : 'Cast to TV'"
        :aria-pressed="casting"
        :title="casting ? 'Stop casting' : 'Cast to TV'"
        :class="[buttonClass, casting ? 'text-primary' : '']"
        @click="emit('cast')"
      />
      <UButton
        v-if="pipSupported && !casting"
        icon="i-lucide-picture-in-picture-2"
        variant="ghost"
        color="neutral"
        size="sm"
        aria-label="Picture in picture"
        :disabled="!ready"
        :class="buttonClass"
        @click="emit('togglePip')"
      />
      <UButton
        v-if="!casting"
        :icon="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
        title="Fullscreen (F)"
        :class="buttonClass"
        @click="emit('toggleFullscreen')"
      />
    </div>
  </div>
</template>
