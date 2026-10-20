import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Profile name is required.').max(60, 'Profile name is too long.'),
  serverUrl: z.string().trim().url('Must be a valid URL, including http:// or https://'),
  username: z.string().trim().min(1, 'Username is required.'),
  // Empty keeps the stored password: the client never receives it, so it can't send it back.
  password: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing profile id.' })
  }

  const body = await readBodyWithSchema(event, bodySchema)
  const { profile, accountChanged } = await updateProfile(id, body)
  // Rebuild the guide against the new lineup (the guide sources themselves are kept).
  if (accountChanged) {
    await invalidateGuide(id)
    invalidateSearchIndex(id)
  }
  return profile
})
