import { z } from 'zod'

const bodySchema = z.object({
  urls: z
    .array(z.string().trim().url('Each guide source must be a full http:// or https:// URL.').refine(
      url => /^https?:\/\//i.test(url),
      'Each guide source must be a full http:// or https:// URL.'
    ))
    .max(MAX_EPG_SOURCES, `At most ${MAX_EPG_SOURCES} guide sources.`)
})

export default defineEventHandler(async (event) => {
  const { urls } = await readBodyWithSchema(event, bodySchema)
  const { profileId } = await getActiveEpgContext()
  return await setEpgSourceUrls(profileId, urls)
})
