import type { LivePreferences, LivePreferencesPatch } from '#shared/types/preferences'

/** Thin client-side repository over /api/live/preferences. */
export function usePreferencesApi() {
  return {
    getLive: () => $fetch<LivePreferences>('/api/live/preferences'),
    patchLive: (patch: LivePreferencesPatch) =>
      $fetch<LivePreferences>('/api/live/preferences', { method: 'PATCH', body: patch })
  }
}
