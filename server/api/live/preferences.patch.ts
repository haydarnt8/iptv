export default defineEventHandler(async (event) => {
  const patch = await readBodyWithSchema(event, livePreferencesPatchSchema)
  const profileId = await requireActiveProfileId()
  return await updateLivePreferences(profileId, patch)
})
