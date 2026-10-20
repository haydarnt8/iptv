export default defineEventHandler(async () => {
  const profileId = await requireActiveProfileId()
  return await getLivePreferences(profileId)
})
