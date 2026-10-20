// Registers the service worker (production builds only) and listens for the install prompt.
export default defineNuxtPlugin(() => {
  listenForInstallPrompt()
  if (!('serviceWorker' in navigator)) return

  if (import.meta.dev) {
    // A worker left over from a production build on this address would get in the way of the
    // dev server, so development always runs without one.
    navigator.serviceWorker.getRegistrations()
      .then(registrations => registrations.forEach(registration => registration.unregister()))
      .catch(() => {})
    return
  }

  const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {
    // The app works without it; only the offline page and asset cache are lost.
  })
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
})
