import { createServer } from 'node:http'

// In development the server restarts on code changes and the previous instance may
// still hold the port for a moment, so binding is retried briefly.
const BIND_RETRY_MS = 1000
const BIND_MAX_ATTEMPTS = 15

/**
 * The cast port: a second, minimal server on the home network so a Chromecast can fetch
 * streams. It serves only tokenized stream links (opaque, expiring, minted by this computer
 * via /api/cast/media, carrying no credentials) — never pages, profiles or settings, which
 * stay on the localhost-only app server. Set NUXT_CAST_PORT=0 to turn it off.
 */
export default defineNitroPlugin((nitroApp) => {
  const port = Number(useRuntimeConfig().castPort)
  if (!port) return

  const app = createApp()

  // The Chromecast's player fetches HLS via XHR from its own origin, which needs CORS
  // (Google Cast requires it for adaptive streaming), including Range for seeking.
  app.use(defineEventHandler((event) => {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
    })
    if (event.method === 'OPTIONS') {
      setResponseHeaders(event, {
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Max-Age': '86400'
      })
      setResponseStatus(event, 204)
      return ''
    }
  }))

  const router = createRouter()
  router.use(STREAM_LINK_ROUTE, defineEventHandler(serveStreamLink), ['get', 'head'])
  app.use(router)

  const server = createServer(toNodeListener(app))
  let attempts = 0
  let closed = false

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && !closed && ++attempts < BIND_MAX_ATTEMPTS) {
      setTimeout(() => server.listen(port, '0.0.0.0'), BIND_RETRY_MS)
      return
    }
    console.warn(`[cast] Couldn't open the cast port ${port}: ${error.message}. Casting is unavailable.`)
  })

  server.listen(port, '0.0.0.0')

  nitroApp.hooks.hook('close', () => {
    closed = true
    server.closeAllConnections()
    server.close()
  })
})
