// https://nuxt.com/docs/api/configuration/nuxt-config
// Production response headers. The CSP allows only what the app uses: its own code plus Google's
// Cast sender script, artwork from any provider host, media/workers from blob: (hls.js), and API
// calls to itself. Nuxt's inline payload scripts need 'unsafe-inline'.
const contentSecurityPolicy = [
  "default-src 'self'",
  // No scheme on purpose: on an http:// page the Cast loader fetches its follow-up scripts over http.
  "script-src 'self' 'unsafe-inline' www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  'img-src * data: blob:',
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "font-src 'self' data:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ')

const securityHeaders = {
  'Content-Security-Policy': contentSecurityPolicy,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // Also keeps the app's URLs out of requests for provider artwork.
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
}

export default defineNuxtConfig({
  $production: {
    routeRules: {
      '/**': { headers: securityHeaders }
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', href: '/icons/icon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' }
      ],
      meta: [
        { name: 'theme-color', content: '#09090b', media: '(prefers-color-scheme: dark)' },
        { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        { name: 'apple-mobile-web-app-title', content: 'IPTV' },
        // Installed on iOS: draw under the status bar; the layout pads with safe-area insets.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        // Lets the layout extend under the iPhone notch/home bar (it pads with safe-area insets).
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ]
    }
  },
  runtimeConfig: {
    // NUXT_PROFILE_ENCRYPTION_KEY - see .env.example
    profileEncryptionKey: '',
    // NUXT_CAST_PORT - port on the home network that serves stream links to a Chromecast (0 = off)
    castPort: 3001,
    // NUXT_CAST_BASE_URL - overrides the detected "http://<this computer's IP>:<castPort>"
    castBaseUrl: ''
  },
  nitro: {
    storage: {
      profiles: { driver: 'fs', base: './.data/profiles' },
      epg: { driver: 'fs', base: './.data/epg' },
      preferences: { driver: 'fs', base: './.data/preferences' }
    }
  }
})