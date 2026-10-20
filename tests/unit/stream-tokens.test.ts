import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerProxyTarget, resolveProxyTarget } from '../../server/utils/stream-proxy-tokens'

describe('stream proxy tokens', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps an opaque token back to its URL', () => {
    const token = registerProxyTarget('http://provider/live/u/p/1.m3u8')
    expect(token).not.toContain('provider')
    expect(resolveProxyTarget(token)).toBe('http://provider/live/u/p/1.m3u8')
    expect(resolveProxyTarget('not-a-token')).toBeNull()
  })

  it('expires after the idle TTL, and each use extends it', () => {
    const token = registerProxyTarget('http://provider/seg.ts', 1000)
    vi.advanceTimersByTime(900)
    expect(resolveProxyTarget(token)).not.toBeNull()
    vi.advanceTimersByTime(900)
    expect(resolveProxyTarget(token)).not.toBeNull()
    vi.advanceTimersByTime(1001)
    expect(resolveProxyTarget(token)).toBeNull()
  })
})
