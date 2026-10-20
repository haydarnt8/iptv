import type { XtreamAccountInfo, XtreamConnectionTestResult } from '#shared/types/profile'
import type { LiveStream, SeriesDetails, SeriesSummary, VodDetails, VodStream, XtreamCategory } from '#shared/types/xtream'
import {
  normalizeCategory,
  normalizeLiveStream,
  normalizeSeriesInfo,
  normalizeSeriesSummary,
  normalizeVodInfo,
  normalizeVodStream,
  toNumberOrNull
} from './normalize'

export interface XtreamCredentials {
  serverUrl: string
  username: string
  password: string
}

const REQUEST_TIMEOUT_MS = 10_000
// A whole catalogue (no category filter) can be 15+ MB, and the timeout covers the download.
const FULL_LIST_TIMEOUT_MS = 60_000

export class XtreamRequestError extends Error {}

function buildPlayerApiUrl(credentials: XtreamCredentials, params: Record<string, string> = {}): string {
  const base = credentials.serverUrl.replace(/\/+$/, '')
  const url = new URL(`${base}/player_api.php`)
  url.searchParams.set('username', credentials.username)
  url.searchParams.set('password', credentials.password)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

/** Low-level player_api.php caller shared by every Xtream action below. */
async function requestXtream<T>(
  credentials: XtreamCredentials,
  params: Record<string, string> = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(buildPlayerApiUrl(credentials, params), { signal: controller.signal })

    if (!response.ok) {
      throw new XtreamRequestError(`Server responded with HTTP ${response.status}.`)
    }

    const data = await response.json().catch(() => {
      throw new XtreamRequestError('The server did not return valid JSON.')
    })

    return data as T
  } catch (error) {
    if (error instanceof XtreamRequestError) {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new XtreamRequestError('Connection timed out.')
    }
    throw new XtreamRequestError('Couldn\'t reach the server. Check the URL and try again.')
  } finally {
    clearTimeout(timeoutId)
  }
}

interface XtreamUserInfo {
  auth?: number | string
  status?: string
  is_trial?: number | string
  exp_date?: number | string | null
  active_cons?: number | string
  max_connections?: number | string
}

function mapAccountInfo(userInfo: XtreamUserInfo): XtreamAccountInfo {
  return {
    status: typeof userInfo.status === 'string' ? userInfo.status : 'Unknown',
    isTrial: userInfo.is_trial === '1' || userInfo.is_trial === 1,
    expiresAt: userInfo.exp_date ? new Date(Number(userInfo.exp_date) * 1000).toISOString() : null,
    activeConnections: toNumberOrNull(userInfo.active_cons),
    maxConnections: toNumberOrNull(userInfo.max_connections)
  }
}

/**
 * Validates Xtream-compatible credentials by calling the bare player_api.php
 * endpoint. This is the same de facto call used across community Xtream
 * clients to fetch account/auth status (see Phase 0 research notes).
 */
export async function testXtreamConnection(credentials: XtreamCredentials): Promise<XtreamConnectionTestResult> {
  try {
    const data = await requestXtream<{ user_info?: XtreamUserInfo }>(credentials)
    const userInfo = data?.user_info

    if (!userInfo || userInfo.auth === undefined) {
      return { ok: false, message: 'This doesn\'t look like an Xtream-compatible server.' }
    }
    if (Number(userInfo.auth) !== 1) {
      return { ok: false, message: 'Invalid username or password.' }
    }

    return { ok: true, message: 'Connected successfully.', account: mapAccountInfo(userInfo) }
  } catch (error) {
    return { ok: false, message: error instanceof XtreamRequestError ? error.message : 'Something went wrong.' }
  }
}

export async function getAccountInfo(credentials: XtreamCredentials): Promise<XtreamAccountInfo> {
  const data = await requestXtream<{ user_info?: XtreamUserInfo }>(credentials)
  const userInfo = data?.user_info

  if (!userInfo || Number(userInfo.auth) !== 1) {
    throw new XtreamRequestError('Invalid username or password.')
  }

  return mapAccountInfo(userInfo)
}

export async function getLiveCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
  const data = await requestXtream<unknown>(credentials, { action: 'get_live_categories' })
  return Array.isArray(data) ? data.map(normalizeCategory) : []
}

export async function getLiveStreams(credentials: XtreamCredentials, categoryId?: string): Promise<LiveStream[]> {
  const params: Record<string, string> = { action: 'get_live_streams' }
  if (categoryId) params.category_id = categoryId

  const data = await requestXtream<unknown>(credentials, params, categoryId ? REQUEST_TIMEOUT_MS : FULL_LIST_TIMEOUT_MS)
  return Array.isArray(data) ? data.map(normalizeLiveStream) : []
}

export async function getVodCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
  const data = await requestXtream<unknown>(credentials, { action: 'get_vod_categories' })
  return Array.isArray(data) ? data.map(normalizeCategory) : []
}

export async function getVodStreams(credentials: XtreamCredentials, categoryId?: string): Promise<VodStream[]> {
  const params: Record<string, string> = { action: 'get_vod_streams' }
  if (categoryId) params.category_id = categoryId

  const data = await requestXtream<unknown>(credentials, params, categoryId ? REQUEST_TIMEOUT_MS : FULL_LIST_TIMEOUT_MS)
  return Array.isArray(data) ? data.map(normalizeVodStream) : []
}

export async function getVodInfo(credentials: XtreamCredentials, vodId: string): Promise<VodDetails> {
  const data = await requestXtream<unknown>(credentials, { action: 'get_vod_info', vod_id: vodId })
  return normalizeVodInfo(data, Number(vodId))
}

export async function getSeriesCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
  const data = await requestXtream<unknown>(credentials, { action: 'get_series_categories' })
  return Array.isArray(data) ? data.map(normalizeCategory) : []
}

export async function getSeriesList(credentials: XtreamCredentials, categoryId?: string): Promise<SeriesSummary[]> {
  const params: Record<string, string> = { action: 'get_series' }
  if (categoryId) params.category_id = categoryId

  const data = await requestXtream<unknown>(credentials, params, categoryId ? REQUEST_TIMEOUT_MS : FULL_LIST_TIMEOUT_MS)
  return Array.isArray(data) ? data.map(normalizeSeriesSummary) : []
}

export async function getSeriesInfo(credentials: XtreamCredentials, seriesId: string): Promise<SeriesDetails> {
  const data = await requestXtream<unknown>(credentials, { action: 'get_series_info', series_id: seriesId })
  return normalizeSeriesInfo(data)
}
