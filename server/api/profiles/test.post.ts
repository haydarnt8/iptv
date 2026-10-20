import { z } from 'zod'

const bodySchema = z.object({
  serverUrl: z.string().trim().url('Must be a valid URL, including http:// or https://'),
  username: z.string().trim().min(1, 'Username is required.'),
  password: z.string().optional(),
  // When editing, the password field can be left blank to test with the stored one.
  profileId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { serverUrl, username, password, profileId } = await readBodyWithSchema(event, bodySchema)

  let resolvedPassword = password
  if (!resolvedPassword && profileId) {
    const stored = await getProfileWithSecret(profileId)
    if (stored) resolvedPassword = decryptSecret(stored.passwordEncrypted)
  }
  if (!resolvedPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Password is required.' })
  }

  return await testXtreamConnection({ serverUrl, username, password: resolvedPassword })
})
