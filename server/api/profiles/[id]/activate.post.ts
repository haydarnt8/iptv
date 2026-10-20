export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing profile id.' })
  }

  await setActiveProfile(id)
  return { ok: true }
})
