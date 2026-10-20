/**
 * The app (pages, profiles, settings, the Xtream API) is private to the computer running it.
 * A production server listens on every network interface by default, so requests from other
 * devices are refused here. The Chromecast never needs this server: it gets stream links on
 * the separate cast port (see plugins/cast-server), which serves nothing else.
 *
 * Skipped in development: `nuxt dev` only listens on localhost, and its internal proxy hides
 * the real client address behind a header any client could forge.
 */
export default defineEventHandler((event) => {
  if (import.meta.dev) return
  if (!isLoopbackAddress(event.node.req.socket.remoteAddress)) {
    throw createError({ statusCode: 403, statusMessage: 'This app is only available on the computer running it.' })
  }
})
