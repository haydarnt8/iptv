export default defineEventHandler(async () => {
  const context = await getActiveEpgContext()
  await refreshGuideIfStale(context)
  return await getGuideStatus(context.profileId)
})
