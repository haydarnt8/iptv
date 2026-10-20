import { describe, expect, it } from 'vitest'
import { normalizeChannelName, normalizeGuideId } from '../../server/utils/epg/matcher'
import { parseXmltvTime } from '../../server/utils/epg/xmltv'

describe('guide matching keys', () => {
  it('ignores country prefixes, quality tags and punctuation in channel names', () => {
    expect(normalizeChannelName('AR: MBC 1 HD')).toBe('mbc1')
    expect(normalizeChannelName('MBC 1 4K')).toBe('mbc1')
    expect(normalizeChannelName('beIN Sports 2 FHD')).toBe('beinsports2')
  })

  it('normalizes guide ids but keeps the country suffix', () => {
    expect(normalizeGuideId('MBC.1.HD.ae')).toBe('mbc1.ae')
    expect(normalizeGuideId('mbc1.ae')).toBe('mbc1.ae')
  })
})

describe('XMLTV times', () => {
  it('applies the UTC offset', () => {
    expect(parseXmltvTime('20261020183000 +0300')).toBe(Date.UTC(2026, 9, 20, 15, 30))
    expect(parseXmltvTime('20261020183000 -0130')).toBe(Date.UTC(2026, 9, 20, 20, 0))
  })

  it('treats a missing offset as UTC and rejects garbage', () => {
    expect(parseXmltvTime('202610201830')).toBe(Date.UTC(2026, 9, 20, 18, 30))
    expect(parseXmltvTime('yesterday')).toBeNull()
    expect(parseXmltvTime(undefined)).toBeNull()
  })
})
