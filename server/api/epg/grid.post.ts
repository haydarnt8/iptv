import { z } from 'zod'

const MAX_WINDOW_MS = 48 * 60 * 60 * 1000

const bodySchema = z.object({
  // The guide asks for the rows on screen, a few dozen at a time.
  streamIds: z.array(z.number().int().nonnegative()).max(200),
  from: z.number().int(),
  to: z.number().int()
}).refine(({ from, to }) => to > from && to - from <= MAX_WINDOW_MS, 'The time window must be between 0 and 48 hours.')

export default defineEventHandler(async (event) => {
  const { streamIds, from, to } = await readBodyWithSchema(event, bodySchema)
  const context = await getActiveEpgContext()
  await refreshGuideIfStale(context)
  return await getGuideGrid(context.profileId, streamIds, from, to)
})
