import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Profile name is required.').max(60, 'Profile name is too long.'),
  serverUrl: z.string().trim().url('Must be a valid URL, including http:// or https://'),
  username: z.string().trim().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.')
})

export default defineEventHandler(async (event) => {
  const body = await readBodyWithSchema(event, bodySchema)
  return await createProfile(body)
})
