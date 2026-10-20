<script setup lang="ts">
import type { CastMediaRequest } from '#shared/types/cast'
import type { StreamFormat } from '~/composables/useStreamPlayback'

const props = withDefaults(
  defineProps<{
    src: string | null
    format?: StreamFormat
    idleMessage?: string
    /** Live TV: channel up/down + last-channel controls and keys, emitted as `zap`/`last`. */
    zapping?: boolean
    hasLast?: boolean
    /** Shown in the on-screen display (top bar) while controls are visible and briefly after a change. */
    title?: string
    subtitle?: string
    image?: string | null
    /** What to send to a Chromecast for `src`; omit for content that can't be cast. */
    castMedia?: CastMediaRequest | null
  }>(),
  {
    format: 'hls',
    idleMessage: 'Select a channel to start watching',
    zapping: false,
    hasLast: false,
    title: undefined,
    subtitle: undefined,
    image: null,
    castMedia: null
  }
)

const emit = defineEmits<{
  zap: [direction: 1 | -1]
  last: []
}>()

const slots = defineSlots<{
  /** Replaces the default idle message (e.g. a "Resume" button). */
  idle?: () => unknown
  /** Extra buttons in the on-screen display, e.g. a favorite toggle. */
  actions?: () => unknown
}>()

const OSD_VISIBLE_MS = 4000
const CONTROLS_HIDE_MS = 3000

const containerRef = ref<HTMLDivElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)

const isPlaying = ref(false)
const isBuffering = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(100)
const muted = ref(false)
const showControls = ref(true)
const osdVisible = ref(false)
const pipSupported = ref(false)

const isLive = computed(() => !Number.isFinite(duration.value))
const { isFullscreen, toggleFullscreen } = useVideoFullscreen(containerRef, videoRef)

const cast = useCastStore()
const casting = usePlayerCasting({
  src: () => props.src,
  media: () => props.castMedia,
  position: () => currentTime.value
})
const { castingHere, resumeHereNeeded } = casting

const playback = useStreamPlayback({
  video: videoRef,
  // Nothing plays locally while the TV has it.
  src: () => casting.localSrc.value,
  format: () => props.format,
  failureMessage: () => props.zapping
    ? 'This channel isn\'t responding. It may be offline, or your account may be in use on another device.'
    : 'Playback failed. The stream may be offline or unsupported.',
  onLoadStart: () => {
    isPlaying.value = false
    isBuffering.value = false
    currentTime.value = 0
    duration.value = 0
  }
})
const { status } = playback

const showOsd = computed(() => !!props.title && status.value !== 'idle' && (showControls.value || osdVisible.value))

let hideControlsTimer: ReturnType<typeof setTimeout> | null = null
let osdTimer: ReturnType<typeof setTimeout> | null = null
let lastPointerType = 'mouse'

function flashOsd() {
  osdVisible.value = true
  if (osdTimer) clearTimeout(osdTimer)
  osdTimer = setTimeout(() => {
    osdVisible.value = false
  }, OSD_VISIBLE_MS)
}

watch(() => [props.src, props.title], () => {
  if (props.src) flashOsd()
})

function resetControlsTimer() {
  showControls.value = true
  if (hideControlsTimer) clearTimeout(hideControlsTimer)
  // Only hide over a picture that's actually playing. Browsers fire `play` before any
  // data arrives, and while loading or failing the controls are the way out (retry, zap).
  if (isPlaying.value && status.value === 'ready') {
    hideControlsTimer = setTimeout(() => {
      showControls.value = false
    }, CONTROLS_HIDE_MS)
  }
}

watch([isPlaying, status], () => resetControlsTimer())

// --- <video> events ---

function onPlaying() {
  isBuffering.value = false
  playback.onPlaying()
}

function onTimeUpdate() {
  if (videoRef.value) currentTime.value = videoRef.value.currentTime
}

function onDurationChange() {
  if (videoRef.value) duration.value = videoRef.value.duration
}

function onNativeVolumeChange() {
  const video = videoRef.value
  if (!video) return
  volume.value = Math.round(video.volume * 100)
  muted.value = video.muted
  saveVolume(video)
}

// --- Actions ---

function togglePlay() {
  if (castingHere.value) {
    cast.togglePlay()
    return
  }
  const video = videoRef.value
  if (!video || status.value !== 'ready') return
  if (video.paused) video.play().catch(() => {})
  else video.pause()
}

function onPointerDown(event: PointerEvent) {
  lastPointerType = event.pointerType
}

function onVideoClick() {
  // On touch, a tap reveals the controls instead of pausing the stream.
  if (lastPointerType === 'touch') {
    if (showControls.value && isPlaying.value) showControls.value = false
    else resetControlsTimer()
    return
  }
  togglePlay()
}

function toggleMute() {
  const video = videoRef.value
  if (video) video.muted = !video.muted
}

watch(volume, (value) => {
  const video = videoRef.value
  if (!video) return
  video.volume = value / 100
  if (value > 0 && video.muted) video.muted = false
})

function seek(time: number) {
  const video = videoRef.value
  if (!video) return
  video.currentTime = time
  // Some browsers don't fire `timeupdate` right after a seek while paused,
  // so sync our reactive state directly instead of waiting for the event.
  currentTime.value = time
}

function seekBy(seconds: number) {
  const video = videoRef.value
  if (video) seek(Math.min(duration.value, Math.max(0, video.currentTime + seconds)))
}

async function togglePictureInPicture() {
  const video = videoRef.value
  if (!video) return
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture()
    else await video.requestPictureInPicture()
  } catch {
    // Not allowed right now (e.g. no video frames yet).
  }
}

function zap(direction: 1 | -1) {
  emit('zap', direction)
}

// --- Keyboard ---

const ZAP_KEYS: Record<string, 1 | -1> = {
  ArrowUp: -1, PageUp: -1, ChannelUp: -1,
  ArrowDown: 1, PageDown: 1, ChannelDown: 1
}

function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const target = event.target as HTMLElement
  // Sliders own their arrow keys; focused buttons own Space/Enter.
  if (target.closest('[role="slider"]')) return
  const onControl = target !== containerRef.value && target.closest('button, a, input') !== null

  if (props.zapping && props.src) {
    const direction = ZAP_KEYS[event.key]
    if (direction) {
      event.preventDefault()
      zap(direction)
      resetControlsTimer()
      return
    }
    if (event.key === 'l' || event.key === 'L') {
      if (props.hasLast) emit('last')
      return
    }
  }

  const canSeek = status.value === 'ready' && !isLive.value
  switch (event.key) {
    case ' ':
    case 'Enter':
      if (onControl) return
      event.preventDefault()
      togglePlay()
      break
    case 'k':
      togglePlay()
      break
    case 'ArrowRight':
    case 'ArrowLeft':
      if (!canSeek) return
      event.preventDefault()
      seekBy(event.key === 'ArrowRight' ? 10 : -10)
      break
    case 'ArrowUp':
    case '+':
    case '=':
      event.preventDefault()
      volume.value = Math.min(100, volume.value + 5)
      break
    case 'ArrowDown':
    case '-':
      event.preventDefault()
      volume.value = Math.max(0, volume.value - 5)
      break
    case 'm':
    case 'M':
      toggleMute()
      break
    case 'f':
    case 'F':
      toggleFullscreen()
      break
    default:
      return
  }
  resetControlsTimer()
}

// Swipe up/down zaps in fullscreen on touch screens, like a TV app.
let touchStart: { x: number, y: number } | null = null

function onTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  touchStart = touch && event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null
}

function onTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touchStart || !touch || !props.zapping || !isFullscreen.value) return
  const dx = touch.clientX - touchStart.x
  const dy = touch.clientY - touchStart.y
  touchStart = null
  if (Math.abs(dy) > 60 && Math.abs(dx) < 50) zap(dy < 0 ? 1 : -1)
}

function focus() {
  containerRef.value?.focus({ preventScroll: true })
}

defineExpose({ focus })

onMounted(() => {
  pipSupported.value = document.pictureInPictureEnabled === true
  if (videoRef.value) restoreVolume(videoRef.value)
  if (props.src) flashOsd()
})

onBeforeUnmount(() => {
  if (hideControlsTimer) clearTimeout(hideControlsTimer)
  if (osdTimer) clearTimeout(osdTimer)
})
</script>

<template>
  <div
    ref="containerRef"
    class="group relative aspect-video w-full overflow-hidden rounded-lg bg-black outline-none after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:ring-primary after:ring-inset focus-visible:after:ring-2"
    :class="{ 'cursor-none': !showControls && isPlaying, 'rounded-none': isFullscreen }"
    tabindex="0"
    role="region"
    aria-label="Video player"
    @mousemove="resetControlsTimer"
    @pointerdown="onPointerDown"
    @keydown="onKeydown"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
  >
    <video
      ref="videoRef"
      class="h-full w-full"
      playsinline
      @loadedmetadata="playback.onLoadedMetadata"
      @loadeddata="playback.onLoadedData"
      @error="playback.onError"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @waiting="isBuffering = true"
      @playing="onPlaying"
      @timeupdate="onTimeUpdate"
      @durationchange="onDurationChange"
      @volumechange="onNativeVolumeChange"
      @click="onVideoClick"
      @dblclick="toggleFullscreen"
    />

    <PlayerOsd v-if="title" :visible="showOsd" :title="title" :subtitle="subtitle" :image="image">
      <template v-if="slots.actions" #actions>
        <slot name="actions" />
      </template>
    </PlayerOsd>

    <PlayerCastOverlay
      v-if="castingHere || resumeHereNeeded"
      :mode="castingHere ? 'casting' : 'ended'"
      :device-name="cast.deviceName"
      :title="castMedia?.title"
      :loading="cast.loading"
      :error="cast.error"
      :remote-state="cast.remoteState"
      @retry="casting.retryOnTv"
      @stop="cast.disconnect"
      @resume-here="casting.resumeHere"
    />

    <PlayerStatusOverlay
      v-else
      :status="status"
      :error-message="playback.errorMessage.value"
      :reconnect-attempt="playback.reconnectAttempt.value"
      :max-attempts="playback.maxAttempts.value"
      :is-playing="isPlaying"
      :is-buffering="isBuffering"
      :idle-message="idleMessage"
      :zapping="zapping"
      @retry="playback.retry"
      @next="zap(1)"
      @toggle-play="togglePlay"
    >
      <template v-if="slots.idle" #idle>
        <slot name="idle" />
      </template>
    </PlayerStatusOverlay>

    <PlayerControls
      v-if="status !== 'idle' || castingHere"
      v-model:volume="volume"
      :visible="showControls || castingHere"
      :status="status"
      :is-playing="castingHere ? !cast.isPaused : isPlaying"
      :is-live="isLive"
      :current-time="currentTime"
      :duration="duration"
      :muted="muted"
      :zapping="zapping"
      :has-last="hasLast"
      :pip-supported="pipSupported"
      :is-fullscreen="isFullscreen"
      :can-cast="casting.canCast.value"
      :casting="castingHere"
      @toggle-play="togglePlay"
      @seek="seek"
      @zap="zap"
      @last="emit('last')"
      @toggle-mute="toggleMute"
      @toggle-pip="togglePictureInPicture"
      @toggle-fullscreen="toggleFullscreen"
      @cast="casting.toggleCasting"
    />
  </div>
</template>
