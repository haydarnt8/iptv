/**
 * Loader and minimal typings for the Google Cast Web Sender SDK (CAF), covering only what this
 * app uses. The SDK only exists in Chromium browsers (Chrome, Edge) on desktop and Android.
 * Reference: https://developers.google.com/cast/docs/web_sender
 */

export type CastState = 'NO_DEVICES_AVAILABLE' | 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED'
export type CastSessionState
  = | 'NO_SESSION' | 'SESSION_STARTING' | 'SESSION_STARTED' | 'SESSION_START_FAILED'
    | 'SESSION_ENDING' | 'SESSION_ENDED' | 'SESSION_RESUMED'

export interface CastImage { url: string }

export interface CastMediaMetadata {
  title?: string
  subtitle?: string
  images?: CastImage[]
}

export interface CastMediaInfo {
  contentUrl?: string
  streamType: string
  metadata: CastMediaMetadata | null
  hlsSegmentFormat?: string
  hlsVideoSegmentFormat?: string
}

export interface CastLoadRequest {
  autoplay: boolean
  currentTime: number
}

export interface CastSession {
  getCastDevice(): { friendlyName: string }
  /** Rejects with a chrome.cast.ErrorCode string. */
  loadMedia(request: CastLoadRequest): Promise<void>
  getMediaSession(): { idleReason: string | null } | null
}

export interface CastContext {
  setOptions(options: { receiverApplicationId: string, autoJoinPolicy: string }): void
  addEventListener(type: 'caststatechanged', handler: (event: { castState: CastState }) => void): void
  addEventListener(type: 'sessionstatechanged', handler: (event: { sessionState: CastSessionState }) => void): void
  getCastState(): CastState
  getCurrentSession(): CastSession | null
  /** Opens the browser's device picker; rejects if cancelled or failed. */
  requestSession(): Promise<void>
  endCurrentSession(stopCasting: boolean): void
}

export interface RemotePlayer {
  isMediaLoaded: boolean
  isPaused: boolean
  /** 'IDLE' | 'PLAYING' | 'PAUSED' | 'BUFFERING' */
  playerState: string | null
}

export interface RemotePlayerController {
  addEventListener(type: string, handler: () => void): void
  playOrPause(): void
}

export interface CastSdk {
  framework: {
    CastContext: { getInstance(): CastContext }
    RemotePlayer: new () => RemotePlayer
    RemotePlayerController: new (player: RemotePlayer) => RemotePlayerController
    RemotePlayerEventType: { ANY_CHANGE: string }
  }
  chrome: {
    AutoJoinPolicy: { ORIGIN_SCOPED: string }
    Image: new (url: string) => CastImage
    media: {
      DEFAULT_MEDIA_RECEIVER_APP_ID: string
      StreamType: { BUFFERED: string, LIVE: string }
      HlsSegmentFormat: { TS: string }
      HlsVideoSegmentFormat: { MPEG2_TS: string }
      MediaInfo: new (contentId: string, contentType: string) => CastMediaInfo
      GenericMediaMetadata: new () => CastMediaMetadata
      LoadRequest: new (mediaInfo: CastMediaInfo) => CastLoadRequest
    }
  }
}

interface CastWindow {
  __onGCastApiAvailable?: (isAvailable: boolean) => void
  cast?: { framework?: CastSdk['framework'] }
  chrome?: { cast?: CastSdk['chrome'] }
}

const SENDER_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1'

let sdkPromise: Promise<CastSdk | null> | null = null

/** Loads the SDK once. Resolves null where casting isn't possible (non-Chromium browser, blocked script). */
export function loadCastSdk(): Promise<CastSdk | null> {
  sdkPromise ??= new Promise((resolve) => {
    const castWindow = window as unknown as CastWindow
    // Only Chromium browsers can cast; don't fetch Google's script anywhere else.
    if (!castWindow.chrome) {
      resolve(null)
      return
    }
    castWindow.__onGCastApiAvailable = (isAvailable) => {
      const framework = castWindow.cast?.framework
      const chrome = castWindow.chrome?.cast
      resolve(isAvailable && framework && chrome ? { framework, chrome } : null)
    }
    const script = document.createElement('script')
    script.src = SENDER_SDK_URL
    script.async = true
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return sdkPromise
}
