import type { Ref } from 'vue'

function isIosSafari(video: HTMLVideoElement): video is HTMLVideoElement & { webkitEnterFullscreen: () => void } {
  return typeof (video as unknown as { webkitEnterFullscreen?: unknown }).webkitEnterFullscreen === 'function'
}

/**
 * Fullscreen for a player: the container goes fullscreen (so custom controls stay visible),
 * falling back to the <video> element itself on iOS Safari.
 */
export function useVideoFullscreen(container: Ref<HTMLElement | null>, video: Ref<HTMLVideoElement | null>) {
  const isFullscreen = ref(false)

  async function toggleFullscreen() {
    const element = video.value
    if (!element) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      // iOS Safari can only fullscreen the <video> element itself (and shows
      // its own native controls while doing so) - it doesn't support
      // fullscreening arbitrary containers at all.
      if (!container.value?.requestFullscreen && isIosSafari(element)) {
        element.webkitEnterFullscreen()
        return
      }

      await container.value?.requestFullscreen()
    } catch {
      // Some browsers/embedded contexts reject fullscreen (e.g. missing
      // permissions policy); fail quietly rather than crash the player.
    }
  }

  function onFullscreenChange() {
    isFullscreen.value = document.fullscreenElement === container.value
  }

  onMounted(() => document.addEventListener('fullscreenchange', onFullscreenChange))
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFullscreenChange))

  return { isFullscreen, toggleFullscreen }
}
