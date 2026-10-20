import { defineStore } from 'pinia'
import type { CastMediaLink, CastMediaRequest } from '#shared/types/cast'
import type { CastContext, CastSdk, CastState, RemotePlayer, RemotePlayerController } from '~/utils/cast-sdk'

export function castMediaKey(request: CastMediaRequest): string {
  return `${request.kind}:${request.id}`
}

/** Google Cast session state, shared by every player and the header indicator. */
export const useCastStore = defineStore('cast', () => {
  const ready = ref(false)
  const castState = ref<CastState>('NO_DEVICES_AVAILABLE')
  const deviceName = ref<string | null>(null)
  const isPaused = ref(false)
  const remoteState = ref<string | null>(null)
  /** What's on the TV (as far as this app knows). */
  const media = shallowRef<CastMediaRequest | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let sdk: CastSdk | null = null
  let context: CastContext | null = null
  let remote: RemotePlayer | null = null
  let controller: RemotePlayerController | null = null
  let initRequest: Promise<void> | null = null
  let latestLoad = 0

  /** Devices are on the network (show the cast button). */
  const available = computed(() => ready.value && castState.value !== 'NO_DEVICES_AVAILABLE')
  const connected = computed(() => castState.value === 'CONNECTED')

  function syncRemote() {
    if (!remote) return
    isPaused.value = remote.isPaused
    remoteState.value = remote.playerState
    const idleReason = context?.getCurrentSession()?.getMediaSession()?.idleReason
    if (remote.playerState === 'IDLE' && idleReason === 'ERROR') {
      error.value = 'Your TV couldn\'t play this stream.'
    }
  }

  /** Loads the SDK and starts tracking devices and sessions. Safe to call repeatedly. */
  function init(): Promise<void> {
    initRequest ??= (async () => {
      sdk = await loadCastSdk()
      if (!sdk) return
      const ctx = sdk.framework.CastContext.getInstance()
      context = ctx
      ctx.setOptions({
        receiverApplicationId: sdk.chrome.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        // Rejoin a session this app started, e.g. after a reload.
        autoJoinPolicy: sdk.chrome.AutoJoinPolicy.ORIGIN_SCOPED
      })
      castState.value = ctx.getCastState()
      ctx.addEventListener('caststatechanged', (event) => {
        castState.value = event.castState
      })
      ctx.addEventListener('sessionstatechanged', (event) => {
        if (event.sessionState === 'SESSION_STARTED' || event.sessionState === 'SESSION_RESUMED') {
          deviceName.value = ctx.getCurrentSession()?.getCastDevice().friendlyName ?? null
          error.value = null
        } else if (event.sessionState === 'SESSION_ENDED') {
          deviceName.value = null
          media.value = null
        }
      })
      deviceName.value = ctx.getCurrentSession()?.getCastDevice().friendlyName ?? null

      remote = new sdk.framework.RemotePlayer()
      controller = new sdk.framework.RemotePlayerController(remote)
      controller.addEventListener(sdk.framework.RemotePlayerEventType.ANY_CHANGE, syncRemote)
      ready.value = true
    })()
    return initRequest
  }

  /** Opens the browser's device picker. Resolves false if the user cancels or it fails. */
  async function connect(): Promise<boolean> {
    await init()
    if (!context) return false
    try {
      await context.requestSession()
      return true
    } catch {
      return false
    }
  }

  /** Plays `request` on the TV; `startTime` resumes a movie where it was. */
  async function load(request: CastMediaRequest, startTime = 0) {
    const session = context?.getCurrentSession()
    if (!sdk || !session) return
    const attempt = ++latestLoad
    loading.value = true
    error.value = null
    // Optimistic, so a quick second call for the same item doesn't load it twice.
    media.value = request

    try {
      const link = await $fetch<CastMediaLink>('/api/cast/media', {
        method: 'POST',
        body: { kind: request.kind, id: request.id, ext: request.ext }
      })
      if (attempt !== latestLoad) return

      const { media: castMedia, Image } = sdk.chrome
      const info = new castMedia.MediaInfo(link.url, link.contentType)
      info.contentUrl = link.url
      info.streamType = link.isLive ? castMedia.StreamType.LIVE : castMedia.StreamType.BUFFERED
      if (link.contentType.includes('mpegurl')) {
        // Xtream live channels are HLS with MPEG-TS segments.
        info.hlsSegmentFormat = castMedia.HlsSegmentFormat.TS
        info.hlsVideoSegmentFormat = castMedia.HlsVideoSegmentFormat.MPEG2_TS
      }
      const metadata = new castMedia.GenericMediaMetadata()
      metadata.title = request.title
      if (request.subtitle) metadata.subtitle = request.subtitle
      if (request.image) metadata.images = [new Image(request.image)]
      info.metadata = metadata

      const loadRequest = new castMedia.LoadRequest(info)
      loadRequest.autoplay = true
      if (!link.isLive && startTime > 0) loadRequest.currentTime = startTime
      await session.loadMedia(loadRequest)
    } catch (caught) {
      if (attempt !== latestLoad) return
      media.value = null
      error.value = typeof caught === 'string'
        // The SDK rejects with an error code when the TV can't load the link.
        ? 'Your TV couldn\'t play this. It may not support the format, or it can\'t reach this computer.'
        : getErrorMessage(caught)
    } finally {
      if (attempt === latestLoad) loading.value = false
    }
  }

  function togglePlay() {
    controller?.playOrPause()
  }

  /** Ends the session and stops playback on the TV. */
  function disconnect() {
    context?.endCurrentSession(true)
  }

  return {
    ready,
    available,
    connected,
    deviceName,
    isPaused,
    remoteState,
    media,
    loading,
    error,
    init,
    connect,
    load,
    togglePlay,
    disconnect
  }
})
