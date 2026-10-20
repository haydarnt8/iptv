import { z } from 'zod'

const querySchema = z.object({
  q: z.string().trim().min(2, 'Type at least 2 characters.').max(100, 'That search is too long.')
})

export default defineEventHandler(async (event) => {
  const result = querySchema.safeParse(getQuery(event))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message ?? 'Invalid search.' })
  }
  return await searchActiveCatalog(result.data.q)
})
