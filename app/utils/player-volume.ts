// A per-viewer convenience, so plain localStorage (wrapped: it can be unavailable).
const VOLUME_STORAGE_KEY = 'iptv-player-volume'

export function saveVolume(video: HTMLVideoElement) {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify({ volume: video.volume, muted: video.muted }))
  } catch {
    // Private mode or blocked storage: volume just won't be remembered.
  }
}

export function restoreVolume(video: HTMLVideoElement) {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(VOLUME_STORAGE_KEY) ?? 'null')
    if (saved && typeof saved === 'object' && 'volume' in saved && 'muted' in saved) {
      if (typeof saved.volume === 'number') video.volume = Math.min(1, Math.max(0, saved.volume))
      if (typeof saved.muted === 'boolean') video.muted = saved.muted
    }
  } catch {
    // Ignore unreadable storage.
  }
}
