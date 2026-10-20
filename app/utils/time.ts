const clockFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

/** "13:45" (or "1:45 PM", per the viewer's locale). */
export function formatClock(epochMs: number): string {
  return clockFormat.format(epochMs)
}

/** "Today", "Tomorrow", or "Wednesday 21 Oct". */
export function formatDay(epochMs: number, now = Date.now()): string {
  const day = new Date(epochMs).setHours(0, 0, 0, 0)
  const today = new Date(now).setHours(0, 0, 0, 0)
  const diffDays = Math.round((day - today) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return dayFormat.format(epochMs)
}

/** 0-100 progress of `now` between start and stop. */
export function programmeProgress(start: number, stop: number, now: number): number {
  if (stop <= start) return 0
  return Math.min(100, Math.max(0, ((now - start) / (stop - start)) * 100))
}

/** Playback position: "4:05" or "1:02:09". */
export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
