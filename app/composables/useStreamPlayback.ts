import type { Ref } from 'vue'

export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'reconnecting' | 'error'
export type StreamFormat = 'hls' | 'direct'

interface StreamPlaybackOptions {
  video: Ref<HTMLVideoElement | null>
  src: () => string | null
  /** 'hls' loads via hls.js (or native HLS on Safari); 'direct' sets `video.src` (progressive MP4 etc). */
  format: () => StreamFormat
  /** Shown once reconnecting gives up. */
  failureMessage: () => string
  /** Called whenever a new load starts, so the caller can reset its own media state. */
  onLoadStart?: () => void
}

// Waiting this long before loading a new source coalesces rapid channel
// changes into one upstream connection (the account may allow only one).
const SOURCE_SETTLE_MS = 300
// Back-off between reconnect attempts; a stream that never started gets fewer.
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000]
const FIRST_LOAD_MAX_ATTEMPTS = 2
const STALL_TIMEOUT_MS = 12_000
const LOAD_TIMEOUT_MS = 20_000
// Reconnect attempts reset once playback has been healthy this long.
const STABLE_AFTER_MS = 30_000
const WATCHDOG_INTERVAL_MS = 2000

type Timer = ReturnType<typeof setTimeout>

function clearTimer(timer: Timer | null) {
  if (timer) clearTimeout(timer)
}

/**
 * Loads a stream into a <video> and keeps it alive: coalesces rapid source changes,
 * recovers decoder errors in place, reconnects with back-off (resuming VOD where it was),
 * and catches streams that stall without an error. The `on*` handlers must be wired to
 * the matching <video> events.
 */
export function useStreamPlayback(options: StreamPlaybackOptions) {
  const status = ref<PlaybackStatus>('idle')
  const errorMessage = ref('')
  const reconnectAttempt = ref(0)
  // Whether the current source has played at all (affects how hard we retry).
  const hasPlayed = ref(false)
  const maxAttempts = computed(() => (hasPlayed.value ? RECONNECT_DELAYS_MS.length : FIRST_LOAD_MAX_ATTEMPTS))

  let hls: import('hls.js').default | null = null
  let settleTimer: Timer | null = null
  let reconnectTimer: Timer | null = null
  let stableTimer: Timer | null = null
  let watchdogTimer: ReturnType<typeof setInterval> | null = null
  // Bumped on every teardown so a load still awaiting hls.js can tell it's stale.
  let loadToken = 0
  let mediaRecoveries = 0
  let loadStartedAt = 0
  let lastProgressTime = -1
  let lastProgressAt = 0
  // VOD position to restore after a reconnect.
  let resumeAt: number | null = null

  /** Stops all network activity for the current source (frees the provider connection). */
  function teardown() {
    loadToken++
    clearTimer(reconnectTimer)
    clearTimer(stableTimer)
    reconnectTimer = null
    stableTimer = null
    if (hls) {
      hls.destroy()
      hls = null
    }
    const video = options.video.value
    if (video?.hasAttribute('src')) {
      video.removeAttribute('src')
      video.load()
    }
  }

  function showError(message: string) {
    teardown()
    status.value = 'error'
    errorMessage.value = message
  }

  function scheduleReconnect() {
    const src = options.src()
    if (!src || reconnectTimer || status.value === 'error') return
    if (reconnectAttempt.value >= maxAttempts.value) {
      showError(options.failureMessage())
      return
    }

    const video = options.video.value
    if (options.format() === 'direct' && video && Number.isFinite(video.duration) && video.currentTime > 0) {
      resumeAt = video.currentTime
    }
    const delay = RECONNECT_DELAYS_MS[reconnectAttempt.value] ?? 15000
    reconnectAttempt.value++
    teardown()
    status.value = 'reconnecting'
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      load(src, { reconnect: true })
    }, delay)
  }

  async function load(src: string, { reconnect = false } = {}) {
    teardown()
    if (!reconnect) {
      reconnectAttempt.value = 0
      hasPlayed.value = false
      resumeAt = null
    }
    mediaRecoveries = 0
    status.value = reconnect ? 'reconnecting' : 'loading'
    errorMessage.value = ''
    loadStartedAt = Date.now()
    options.onLoadStart?.()
    const token = loadToken

    const video = options.video.value
    if (!video) return

    if (options.format() === 'direct') {
      video.src = src
    } else {
      const { default: Hls } = await import('hls.js')
      // The source may have changed (or been torn down) while the chunk loaded.
      if (token !== loadToken) return

      if (Hls.isSupported()) {
        const instance = new Hls()
        hls = instance
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || hls !== instance) return
          // Decoder hiccups are usually recoverable in place; the second try also swaps the audio codec.
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
            mediaRecoveries++
            if (mediaRecoveries === 2) instance.swapAudioCodec()
            instance.recoverMediaError()
            return
          }
          scheduleReconnect()
        })
        instance.loadSource(src)
        instance.attachMedia(video)
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
      } else {
        showError('Your browser can\'t play this stream format.')
        return
      }
    }

    video.play().catch(() => {
      // Autoplay can be blocked by the browser; the big play button lets the user start it.
    })
  }

  function retry() {
    const src = options.src()
    if (src) load(src)
  }

  // Not `{ immediate: true }`: that fires before mount, while the <video> ref is
  // still null. `onMounted` below covers the "already has a src at mount" case.
  watch(options.src, (src) => {
    clearTimer(settleTimer)
    // Release the old stream right away; load the new one once changes settle.
    teardown()
    if (!src) {
      status.value = 'idle'
      return
    }
    status.value = 'loading'
    loadStartedAt = Date.now()
    settleTimer = setTimeout(() => load(src), SOURCE_SETTLE_MS)
  })

  // --- Watchdog: catches streams that stall without an error event ---

  function checkHealth() {
    const video = options.video.value
    if (!video || !options.src()) return
    const now = Date.now()

    const starting = status.value === 'loading' || status.value === 'reconnecting'
    if (starting && !reconnectTimer && now - loadStartedAt > LOAD_TIMEOUT_MS) {
      scheduleReconnect()
      return
    }
    if (status.value !== 'ready' || video.paused) {
      lastProgressAt = now
      return
    }
    if (video.currentTime !== lastProgressTime) {
      lastProgressTime = video.currentTime
      lastProgressAt = now
    } else if (now - lastProgressAt > STALL_TIMEOUT_MS) {
      scheduleReconnect()
    }
  }

  function onOnline() {
    // Network is back: don't wait for the next back-off step.
    const src = options.src()
    if (src && (status.value === 'reconnecting' || status.value === 'error')) {
      reconnectAttempt.value = 0
      load(src, { reconnect: true })
    }
  }

  // --- <video> event handlers ---

  function onLoadedMetadata() {
    const video = options.video.value
    if (video && resumeAt !== null && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(resumeAt, video.duration)
      resumeAt = null
    }
  }

  function onLoadedData() {
    status.value = 'ready'
    lastProgressAt = Date.now()
  }

  function onPlaying() {
    hasPlayed.value = true
    if (status.value !== 'ready') status.value = 'ready'
    clearTimer(stableTimer)
    stableTimer = setTimeout(() => {
      reconnectAttempt.value = 0
    }, STABLE_AFTER_MS)
  }

  function onError() {
    // With hls.js attached, its ERROR event decides (it can often recover).
    if (hls || !options.src()) return
    scheduleReconnect()
  }

  onMounted(() => {
    window.addEventListener('online', onOnline)
    watchdogTimer = setInterval(checkHealth, WATCHDOG_INTERVAL_MS)
    const src = options.src()
    if (src) load(src)
  })

  onBeforeUnmount(() => {
    teardown()
    clearTimer(settleTimer)
    window.removeEventListener('online', onOnline)
    if (watchdogTimer) clearInterval(watchdogTimer)
  })

  return {
    status,
    errorMessage,
    reconnectAttempt,
    maxAttempts,
    retry,
    onLoadedMetadata,
    onLoadedData,
    onPlaying,
    onError
  }
}
