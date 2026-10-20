import type { CastMediaRequest } from '#shared/types/cast'
import { castMediaKey } from '~/stores/cast'

interface PlayerCastingOptions {
  /** What the page wants to play (null = nothing chosen yet). */
  src: () => string | null
  /** What to send to the TV for that source; null = this content can't be cast. */
  media: () => CastMediaRequest | null
  /** Current local playback position in seconds, to continue a movie on the TV. */
  position: () => number
}

// Coalesces quick channel changes into one load on the TV.
const TV_LOAD_SETTLE_MS = 300

/**
 * Decides when a player hands its stream to the TV and when it plays locally:
 * - pressing the cast button sends what's playing (a movie continues where it was);
 * - while connected, whatever the user picks next goes to the TV;
 * - opening a page never takes over the TV unless it's already showing that content;
 * - when casting ends, local playback waits for the user ("Watch here") rather than
 *   reconnecting on its own, since the TV may still hold the account's only connection.
 */
export function usePlayerCasting(options: PlayerCastingOptions) {
  const cast = useCastStore()
  const { connected } = storeToRefs(cast)

  const mediaKey = computed(() => {
    const media = options.media()
    return media ? castMediaKey(media) : null
  })

  // This player's content belongs on the TV.
  const handedOff = ref(connected.value && !!mediaKey.value && !!cast.media && castMediaKey(cast.media) === mediaKey.value)
  const resumeHereNeeded = ref(false)
  let startPosition = 0

  const castingHere = computed(() => connected.value && handedOff.value && !!mediaKey.value && !!options.src())
  /** The source the local <video> should play (null while the TV has it). */
  const localSrc = computed(() => (castingHere.value || resumeHereNeeded.value ? null : options.src()))
  const canCast = computed(() => cast.available && !!mediaKey.value)

  // A new pick from the user: goes to the TV while connected, and clears "Watch here".
  watch(options.src, (src) => {
    resumeHereNeeded.value = false
    if (src && connected.value) handedOff.value = true
  })

  watch(connected, (isConnected) => {
    if (isConnected) return
    if (handedOff.value && options.src()) resumeHereNeeded.value = true
    handedOff.value = false
  })

  let loadTimer: ReturnType<typeof setTimeout> | null = null
  watch([castingHere, mediaKey], ([casting, key]) => {
    if (loadTimer) clearTimeout(loadTimer)
    if (!casting || !key) return
    if (cast.media && castMediaKey(cast.media) === key) return
    const media = options.media()
    const position = startPosition
    startPosition = 0
    if (media) loadTimer = setTimeout(() => cast.load(media, position), TV_LOAD_SETTLE_MS)
  })

  /** The cast button: connect and send, send to an already-connected TV, or stop casting. */
  async function toggleCasting() {
    if (castingHere.value) {
      cast.disconnect()
      return
    }
    // Read the position before the local stream is torn down.
    startPosition = options.position()
    if (!connected.value && !(await cast.connect())) return
    handedOff.value = true
  }

  function resumeHere() {
    resumeHereNeeded.value = false
  }

  /** Sends the current item to the TV again (after an error on the TV). */
  function retryOnTv() {
    const media = options.media()
    if (media) cast.load(media)
  }

  onMounted(() => cast.init())
  onBeforeUnmount(() => {
    if (loadTimer) clearTimeout(loadTimer)
  })

  return { castingHere, localSrc, canCast, resumeHereNeeded, toggleCasting, resumeHere, retryOnTv }
}
