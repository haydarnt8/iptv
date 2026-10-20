import { createGunzip } from 'node:zlib'
import { Parser } from 'htmlparser2'

export interface XmltvChannel {
  id: string
  names: string[]
}

export interface XmltvProgramme {
  channel: string
  start: number
  /** XMLTV makes `stop` optional; filled in from the next programme when missing. */
  stop: number | null
  title: string
  description: string | null
}

interface XmltvHandlers {
  onChannel: (channel: XmltvChannel) => void
  onProgramme: (programme: XmltvProgramme) => void
}

const HEADERS_TIMEOUT_MS = 30_000
const MAX_DOWNLOAD_MS = 10 * 60_000

const XMLTV_TIME = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*(?:([+-])(\d{2})(\d{2}))?/

/** Parses XMLTV times like "20261020183000 +0300" to epoch milliseconds. */
export function parseXmltvTime(value: string | undefined): number | null {
  if (!value) return null
  const m = XMLTV_TIME.exec(value.trim())
  if (!m) return null
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0))
  const offsetMinutes = m[7] ? (m[7] === '-' ? -1 : 1) * (Number(m[8]) * 60 + Number(m[9])) : 0
  return utc - offsetMinutes * 60_000
}

function createXmltvParser(handlers: XmltvHandlers) {
  let channel: XmltvChannel | null = null
  let programme: (Omit<XmltvProgramme, 'start' | 'title'> & { start: number | null, title: string | null }) | null = null
  let field: 'display-name' | 'title' | 'desc' | null = null
  let text = ''

  return new Parser({
    onopentag(name, attribs) {
      if (name === 'channel') {
        channel = { id: attribs.id ?? '', names: [] }
      } else if (name === 'programme') {
        programme = {
          channel: attribs.channel ?? '',
          start: parseXmltvTime(attribs.start),
          stop: parseXmltvTime(attribs.stop),
          title: null,
          description: null
        }
      } else if ((name === 'display-name' && channel) || ((name === 'title' || name === 'desc') && programme)) {
        field = name
        text = ''
      }
    },
    ontext(chunk) {
      // Text arrives in fragments (split across network chunks and entities).
      if (field) text += chunk
    },
    onclosetag(name) {
      if (field && name === field) {
        const value = text.trim()
        if (value) {
          if (field === 'display-name' && channel) channel.names.push(value)
          else if (field === 'title' && programme && programme.title === null) programme.title = value
          else if (field === 'desc' && programme && programme.description === null) programme.description = value
        }
        field = null
      } else if (name === 'channel' && channel) {
        if (channel.id) handlers.onChannel(channel)
        channel = null
      } else if (name === 'programme' && programme) {
        const { channel: channelId, start, stop, title, description } = programme
        programme = null
        if (channelId && start !== null && title) {
          handlers.onProgramme({ channel: channelId, start, stop, title, description })
        }
      }
    }
  }, { xmlMode: true, decodeEntities: true })
}

/**
 * Downloads and parses an XMLTV document as a stream. Guide files run to
 * hundreds of MB (a free all-countries guide is 195 MB gzipped, ~2.9M
 * programmes), so nothing is ever held in memory beyond the current chunk.
 * Gzip is detected from the magic bytes because free sources serve `.gz`
 * files under misleading content types.
 */
export async function streamXmltv(url: string, handlers: XmltvHandlers): Promise<void> {
  const controller = new AbortController()
  const headersTimer = setTimeout(() => controller.abort(), HEADERS_TIMEOUT_MS)
  const totalTimer = setTimeout(() => controller.abort(), MAX_DOWNLOAD_MS)

  try {
    let response: Response
    try {
      response = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    } finally {
      clearTimeout(headersTimer)
    }
    if (!response.ok || !response.body) {
      throw new Error(`Guide server responded with HTTP ${response.status}.`)
    }

    const parser = createXmltvParser(handlers)
    const decoder = new TextDecoder()
    const feed = (bytes: Uint8Array) => parser.write(decoder.decode(bytes, { stream: true }))
    const reader = response.body.getReader()

    const first = await reader.read()
    if (first.done) throw new Error('The guide was empty.')

    if (first.value[0] === 0x1F && first.value[1] === 0x8B) {
      await gunzipInto(reader, first.value, feed)
    } else {
      feed(first.value)
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        feed(chunk.value)
      }
    }

    parser.write(decoder.decode())
    parser.end()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timed out downloading the guide.', { cause: error })
    }
    throw error
  } finally {
    clearTimeout(totalTimer)
  }
}

async function gunzipInto(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  firstChunk: Uint8Array,
  feed: (bytes: Uint8Array) => void
): Promise<void> {
  const gunzip = createGunzip()
  let feedError: unknown = null

  gunzip.on('data', (chunk: Buffer) => {
    if (feedError) return
    try {
      feed(chunk)
    } catch (error) {
      feedError = error
    }
  })
  const finished = new Promise<void>((resolve, reject) => {
    gunzip.once('end', resolve)
    gunzip.once('error', reject)
  })
  const write = (bytes: Uint8Array) => new Promise<void>((resolve, reject) => {
    gunzip.write(bytes, error => (error ? reject(error) : resolve()))
  })

  await write(firstChunk)
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    if (feedError) {
      await reader.cancel()
      break
    }
    await write(chunk.value)
  }
  gunzip.end()
  await finished
  if (feedError) throw feedError
}
