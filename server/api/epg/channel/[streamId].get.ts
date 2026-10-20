export default defineEventHandler(async (event) => {
  const streamId = Number(getRouterParam(event, 'streamId'))
  if (!Number.isInteger(streamId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid channel id.' })
  }
  const { profileId } = await getActiveEpgContext()
  return await getSchedule(profileId, streamId)
})
