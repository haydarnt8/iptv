// Containers no mainstream browser plays, regardless of engine.
const NEVER_SUPPORTED_CONTAINERS = ['avi', 'wmv']

export function normalizeContainerExtension(extension: string | null | undefined): string {
  return (extension ?? 'mp4').toLowerCase()
}

/**
 * MKV support depends on the browser engine: Chromium plays H.264/AAC (and
 * even HEVC) Matroska natively, Firefox and Safari don't - verified against a
 * real provider catalog where over half the movies are MKV. So ask the
 * browser rather than hardcoding. On the server we can't ask, so assume it's
 * worth attempting; the player's own error state covers genuine failures.
 */
export function isContainerSupported(extension: string | null | undefined): boolean {
  const normalized = normalizeContainerExtension(extension)

  if (NEVER_SUPPORTED_CONTAINERS.includes(normalized)) {
    return false
  }

  if (normalized === 'mkv' && import.meta.client) {
    return document.createElement('video').canPlayType('video/x-matroska') !== ''
  }

  return true
}

export function getPlayerFormat(extension: string | null | undefined): 'hls' | 'direct' {
  return normalizeContainerExtension(extension) === 'm3u8' ? 'hls' : 'direct'
}
