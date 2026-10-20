import { describe, expect, it } from 'vitest'
import { findNavItem } from '~/utils/nav'
import { getPlayerFormat, isContainerSupported } from '~/utils/playback'
import { formatPlaybackTime, programmeProgress } from '~/utils/time'

describe('navigation', () => {
  it('highlights the most specific section', () => {
    expect(findNavItem('/')?.label).toBe('Home')
    expect(findNavItem('/live')?.label).toBe('Live TV')
    expect(findNavItem('/live/guide')?.label).toBe('TV Guide')
    expect(findNavItem('/movies/123')?.label).toBe('Movies')
    expect(findNavItem('/nowhere')).toBeNull()
  })
})

describe('playback helpers', () => {
  it('knows which containers browsers never play', () => {
    expect(isContainerSupported('AVI')).toBe(false)
    expect(isContainerSupported('mp4')).toBe(true)
    expect(isContainerSupported(null)).toBe(true)
    expect(getPlayerFormat('m3u8')).toBe('hls')
    expect(getPlayerFormat('mkv')).toBe('direct')
  })

  it('formats positions and progress', () => {
    expect(formatPlaybackTime(65)).toBe('1:05')
    expect(formatPlaybackTime(3725)).toBe('1:02:05')
    expect(formatPlaybackTime(Number.NaN)).toBe('0:00')
    expect(programmeProgress(0, 100, 50)).toBe(50)
    expect(programmeProgress(0, 100, 500)).toBe(100)
    expect(programmeProgress(100, 100, 100)).toBe(0)
  })
})
