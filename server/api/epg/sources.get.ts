export default defineEventHandler(async () => {
  const { profileId } = await getActiveEpgContext()
  return await getEpgSourceUrls(profileId)
})
