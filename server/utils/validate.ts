import type { H3Event } from 'h3'
import type { z } from 'zod'

export async function readBodyWithSchema<T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T
): Promise<z.infer<T>> {
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error.issues[0]?.message ?? 'Invalid request body.'
    })
  }

  return result.data
}
