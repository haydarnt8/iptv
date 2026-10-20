/**
 * Accent colours offered in Settings. Red and blue keep WCAG AA contrast (≥ 4.5:1) with white text
 * on their 600 shade (light mode); yellow is light, so it gets dark text instead (`--ui-on-primary`
 * and `--ui-primary-ink` in main.css). Dark mode uses the 400 shades with dark text.
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
