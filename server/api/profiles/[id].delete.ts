export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing profile id.' })
  }

  await deleteProfile(id)
  // Data that only made sense for this profile goes with it.
  await Promise.all([deleteLivePreferences(id), deleteGuideData(id)])
  return { ok: true }
})
