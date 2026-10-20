import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildUpstreamStreamUrl, sanitizeExtension } from '../../server/utils/xtream/stream-urls'

describe('upstream stream URLs', () => {
  beforeEach(() => {
    vi.stubGlobal('getActiveProfileWithSecret', async () => ({
      serverUrl: 'http://provider.example:8080/',
      username: 'user name',
      passwordEncrypted: 'encrypted'
    }))
    vi.stubGlobal('decryptSecret', () => 'p@ss/word')
    vi.stubGlobal('createError', (input: { statusMessage: string }) => new Error(input.statusMessage))
  })

  it('only accepts short alphanumeric container extensions', () => {
    expect(sanitizeExtension('MKV')).toBe('mkv')
    expect(sanitizeExtension('mp4?x=1')).toBe('mp4')
    expect(sanitizeExtension('../../etc')).toBe('mp4')
    expect(sanitizeExtension(undefined, 'ts')).toBe('ts')
  })

  it('builds encoded live and VOD URLs', async () => {
    expect(await buildUpstreamStreamUrl('live', '42')).toBe('http://provider.example:8080/live/user%20name/p%40ss%2Fword/42.m3u8')
    expect(await buildUpstreamStreamUrl('movie', '7', 'mkv')).toBe('http://provider.example:8080/movie/user%20name/p%40ss%2Fword/7.mkv')
    expect(await buildUpstreamStreamUrl('series', '9', 'bad/ext')).toMatch(/\/9\.mp4$/)
  })

  it('needs an active profile', async () => {
    vi.stubGlobal('getActiveProfileWithSecret', async () => null)
    await expect(buildUpstreamStreamUrl('live', '1')).rejects.toThrow(/No active IPTV profile/)
  })
})
