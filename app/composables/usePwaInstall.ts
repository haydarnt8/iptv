/** Chromium's install prompt event (not in the standard DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Module-level: the browser fires the event once per page load, before any page asks for it.
const installEvent = shallowRef<BeforeInstallPromptEvent | null>(null)
const installed = ref(false)

/** Called once from the service-worker plugin. */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's own mini-infobar quiet; Settings offers the button instead.
    event.preventDefault()
    installEvent.value = event as BeforeInstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    installEvent.value = null
  })
  installed.value = window.matchMedia('(display-mode: standalone)').matches
}

/** Install-as-app state for Settings. `canPrompt` is only true in browsers that offer it (Chrome, Edge). */
export function usePwaInstall() {
  const canPrompt = computed(() => installEvent.value !== null)

  async function install() {
    const event = installEvent.value
    if (!event) return
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') installEvent.value = null
  }

  return { canPrompt, installed: readonly(installed), install }
}
