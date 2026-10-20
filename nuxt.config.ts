// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  app: {
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
        { name: 'mobile-web-app-capable', content: 'yes' }
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