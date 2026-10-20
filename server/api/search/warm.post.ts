// Called when the app opens, so the catalogue index is ready by the time the user searches.
export default defineEventHandler(async () => {
  await warmActiveSearchIndex()
  return { ok: true }
})
