import type { AccentColor } from '~/utils/theme'
import { DEFAULT_ACCENT, isAccentColor } from '~/utils/theme'

/**
 * The accent colour, kept in a cookie (not sensitive) so the server renders the right colour on
 * first paint instead of flashing the default.
 */
export function useAccentColor() {
  const cookie = useCookie<string>('iptv-accent', {
    default: () => DEFAULT_ACCENT,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })
  const appConfig = useAppConfig()

  const accent = computed<AccentColor>({
    get: () => (isAccentColor(cookie.value) ? cookie.value : DEFAULT_ACCENT),
    set: (value) => {
      cookie.value = value
      appConfig.ui.colors.primary = value
    }
  })

  function apply() {
    appConfig.ui.colors.primary = accent.value
  }

  return { accent, apply }
}
