/**
 * Accent colours offered in Settings. Each one keeps WCAG AA contrast (≥ 4.5:1) for white text on
 * its 600 shade (light mode) and dark text on its 400 shade (dark mode). Greens, teals, sky,
 * amber and orange fail the light-mode check, so they're left out.
 */
export const ACCENT_COLORS = ['yellow', 'red', 'blue'] as const

export type AccentColor = typeof ACCENT_COLORS[number]

export const DEFAULT_ACCENT: AccentColor = 'yellow'

/** Literal class names so Tailwind's scanner generates them. */
export const ACCENT_SWATCH_CLASS: Record<AccentColor, string> = {
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500'
}

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && (ACCENT_COLORS as readonly string[]).includes(value)
}
