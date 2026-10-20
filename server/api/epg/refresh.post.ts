export default defineEventHandler(async () => {
  const context = await getActiveEpgContext()
  // Runs in the background: a large guide takes a minute or more to ingest.
  void startGuideBuild(context)
  return await getGuideStatus(context.profileId)
})
