import { describe, expect, it } from 'vitest'
import {
  normalizeCategory,
  normalizeLiveStream,
  normalizeSeriesInfo,
  normalizeVodInfo,
  toNumberOrNull,
  toTextOrNull
} from '../../server/utils/xtream/normalize'

describe('provider data normalization', () => {
  it('coerces numbers sent as strings and tolerates junk', () => {
    expect(toNumberOrNull('42')).toBe(42)
    expect(toNumberOrNull('N/A')).toBeNull()
    expect(toNumberOrNull('')).toBeNull()
    expect(toNumberOrNull(undefined)).toBeNull()
  })

  it('unescapes double-escaped quotes in free text', () => {
    expect(toTextOrNull('they ask, \\\\\\"Why?\\\\\\"')).toBe('they ask, "Why?"')
    expect(toTextOrNull('   ')).toBeNull()
  })

  it('maps a live stream and fills safe defaults', () => {
    expect(normalizeLiveStream({ stream_id: '12', name: ' MBC 1 ', category_id: 5, stream_icon: '' })).toEqual({
      streamId: 12,
      name: 'MBC 1',
      categoryId: '5',
      streamIcon: null,
      epgChannelId: null
    })
    expect(normalizeLiveStream(null).name).toBe('Unknown channel')
    expect(normalizeLiveStream(['not', 'an', 'object']).streamId).toBe(0)
  })

  it('treats parent id "0" as no parent', () => {
    expect(normalizeCategory({ category_id: 1, category_name: 'News', parent_id: '0' }).parentId).toBeNull()
  })

  it('reads get_vod_info split across info and movie_data', () => {
    const details = normalizeVodInfo({
      info: { name: 'Info name', plot: 'Plot', duration_secs: '5400', movie_image: 'https://img/cover.jpg' },
      movie_data: { stream_id: '99', name: 'Movie', container_extension: 'mkv' }
    }, 1)
    expect(details).toMatchObject({ streamId: 99, name: 'Movie', durationSecs: 5400, cover: 'https://img/cover.jpg', containerExtension: 'mkv' })
    expect(normalizeVodInfo({}, 7).streamId).toBe(7)
  })

  it('flattens episodes from both the object and the array shapes', () => {
    const fromObject = normalizeSeriesInfo({
      info: { name: 'Show' },
      episodes: { 2: [{ id: '201', episode_num: '1', title: 'Pilot', info: { duration_secs: 1800 } }] }
    })
    expect(fromObject.episodes).toEqual([
      { id: '201', seasonNumber: 2, episodeNum: 1, title: 'Pilot', containerExtension: null, plot: null, durationSecs: 1800 }
    ])

    const fromArray = normalizeSeriesInfo({ episodes: [[{ id: 'a', season: 3, episode_num: 4 }]] })
    expect(fromArray.episodes[0]).toMatchObject({ id: 'a', seasonNumber: 3, episodeNum: 4, title: 'Episode 4' })
    expect(normalizeSeriesInfo(undefined)).toMatchObject({ seasons: [], episodes: [] })
  })
})
