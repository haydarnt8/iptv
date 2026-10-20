import type { XtreamAccountInfo } from '#shared/types/profile'
import type { LiveStream, SeriesDetails, SeriesSummary, VodDetails, VodStream, XtreamCategory } from '#shared/types/xtream'
import { XtreamRequestError } from './client'
import type { XtreamCredentials } from './client'

async function getActiveCredentials(): Promise<XtreamCredentials> {
  const profile = await getActiveProfileWithSecret()

  if (!profile) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No active IPTV profile. Add one in Profiles first.'
    })
  }

  return {
    serverUrl: profile.serverUrl,
    username: profile.username,
    password: decryptSecret(profile.passwordEncrypted)
  }
}

/** Translates a low-level Xtream request failure into a client-safe HTTP error. */
async function wrapXtreamErrors<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation
  } catch (error) {
    if (error instanceof XtreamRequestError) {
      throw createError({ statusCode: 502, statusMessage: error.message })
    }
    throw error
  }
}

export async function fetchAccountInfo(): Promise<XtreamAccountInfo> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getAccountInfo(credentials))
}

export async function fetchLiveCategories(): Promise<XtreamCategory[]> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getLiveCategories(credentials))
}

export async function fetchLiveStreams(categoryId?: string): Promise<LiveStream[]> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getLiveStreams(credentials, categoryId))
}

export async function fetchVodCategories(): Promise<XtreamCategory[]> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getVodCategories(credentials))
}

export async function fetchVodStreams(categoryId?: string): Promise<VodStream[]> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getVodStreams(credentials, categoryId))
}

export async function fetchVodDetails(vodId: string): Promise<VodDetails> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getVodInfo(credentials, vodId))
}

export async function fetchSeriesCategories(): Promise<XtreamCategory[]> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getSeriesCategories(credentials))
}

export async function fetchSeriesList(categoryId?: string): Promise<SeriesSummary[]> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getSeriesList(credentials, categoryId))
}

export async function fetchSeriesDetails(seriesId: string): Promise<SeriesDetails> {
  const credentials = await getActiveCredentials()
  return wrapXtreamErrors(getSeriesInfo(credentials, seriesId))
}
