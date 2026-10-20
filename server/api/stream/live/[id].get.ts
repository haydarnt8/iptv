export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing stream id.' })
  }

  return await proxyHlsResource(event, await buildUpstreamStreamUrl('live', id))
})
