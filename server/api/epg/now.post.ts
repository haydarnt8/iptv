import { z } from 'zod'

const bodySchema = z.object({
  // A category can hold a few hundred channels; cap it so one request stays cheap.
  streamIds: z.array(z.number().int().nonnegative()).max(1000)
})

export default defineEventHandler(async (event) => {
  const { streamIds } = await readBodyWithSchema(event, bodySchema)
  const context = await getActiveEpgContext()
  await refreshGuideIfStale(context)
  return await getNowNext(context.profileId, streamIds)
})
