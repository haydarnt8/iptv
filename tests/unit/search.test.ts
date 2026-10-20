import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateSearchIndex, normalizeForSearch, searchCatalog } from '../../server/utils/xtream/search-index'

const credentials = { serverUrl: 'http://x', username: 'u', password: 'p' }

describe('catalogue search', () => {
  const fetches = { count: 0 }

  beforeEach(() => {
    fetches.count = 0
    invalidateSearchIndex('profile')
    vi.stubGlobal('getLiveStreams', async () => {
      fetches.count++
      return [
        { streamId: 1, name: 'BeIN Sports 2 HD', categoryId: null, streamIcon: null, epgChannelId: null },
        { streamId: 2, name: 'Sports News', categoryId: null, streamIcon: null, epgChannelId: null }
      ]
    })
    vi.stubGlobal('getVodStreams', async () => [
      { streamId: 10, name: 'The Amazing Spider-Man', categoryId: null, streamIcon: null, rating: null, containerExtension: 'mp4' },
      { streamId: 11, name: 'Spider', categoryId: null, streamIcon: null, rating: null, containerExtension: 'mp4' },
      { streamId: 12, name: 'Pokémon Detective', categoryId: null, streamIcon: null, rating: null, containerExtension: 'mp4' }
    ])
    vi.stubGlobal('getSeriesList', async () => [])
  })

  it('ignores case and accents', () => {
    expect(normalizeForSearch('Pokémon')).toBe('pokemon')
  })

  it('matches every word and ranks names that start with the query first', async () => {
    const results = await searchCatalog('profile', credentials, 'spider')
    expect(results.movies.map(movie => movie.streamId)).toEqual([11, 10])
    expect((await searchCatalog('profile', credentials, 'sports bein')).live.map(c => c.streamId)).toEqual([1])
    expect((await searchCatalog('profile', credentials, 'pokemon')).movies.map(m => m.streamId)).toEqual([12])
  })

  it('builds the index once and reuses it', async () => {
    await Promise.all([searchCatalog('profile', credentials, 'a b'), searchCatalog('profile', credentials, 'news')])
    await searchCatalog('profile', credentials, 'sports')
    expect(fetches.count).toBe(1)
  })
})
