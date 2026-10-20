export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as { data?: { statusMessage?: string, message?: string }, statusMessage?: string, message?: string }
    return err.data?.statusMessage ?? err.data?.message ?? err.statusMessage ?? err.message ?? 'Something went wrong.'
  }
  return 'Something went wrong.'
}
