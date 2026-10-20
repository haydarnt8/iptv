export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing episode id.' })
  }

  const extension = sanitizeExtension(getQuery(event).ext)
  return await proxyHlsResource(event, await buildUpstreamStreamUrl('series', id, extension))
})
