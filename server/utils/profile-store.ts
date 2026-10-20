import { randomUUID } from 'node:crypto'
import type { IptvProfileSummary } from '#shared/types/profile'

export interface StoredIptvProfile {
  id: string
  name: string
  serverUrl: string
  username: string
  passwordEncrypted: string
  createdAt: string
}

export interface CreateProfileInput {
  name: string
  serverUrl: string
  username: string
  password: string
}

export interface UpdateProfileInput {
  name: string
  serverUrl: string
  username: string
  /** Omitted or empty keeps the stored password. */
  password?: string
}

function normalizeServerUrl(serverUrl: string): string {
  return serverUrl.replace(/\/+$/, '')
}

const PROFILE_PREFIX = 'profile:'
const ACTIVE_KEY = 'active-profile-id'

function storage() {
  return useStorage('profiles')
}

function toSummary(profile: StoredIptvProfile, activeId: string | null): IptvProfileSummary {
  return {
    id: profile.id,
    name: profile.name,
    serverUrl: profile.serverUrl,
    username: profile.username,
    createdAt: profile.createdAt,
    isActive: profile.id === activeId
  }
}

async function getActiveId(): Promise<string | null> {
  return (await storage().getItem<string>(ACTIVE_KEY)) ?? null
}

export async function listProfileSummaries(): Promise<IptvProfileSummary[]> {
  const keys = (await storage().getKeys()).filter(key => key.startsWith(PROFILE_PREFIX))
  const activeId = await getActiveId()

  const profiles = await Promise.all(
    keys.map(key => storage().getItem<StoredIptvProfile>(key))
  )

  return profiles
    .filter((profile): profile is StoredIptvProfile => Boolean(profile))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(profile => toSummary(profile, activeId))
}

export async function createProfile(input: CreateProfileInput): Promise<IptvProfileSummary> {
  const id = randomUUID()
  const stored: StoredIptvProfile = {
    id,
    name: input.name,
    serverUrl: normalizeServerUrl(input.serverUrl),
    username: input.username,
    passwordEncrypted: encryptSecret(input.password),
    createdAt: new Date().toISOString()
  }

  await storage().setItem(`${PROFILE_PREFIX}${id}`, stored)

  // First profile created becomes active automatically.
  const activeId = await getActiveId()
  if (!activeId) {
    await storage().setItem(ACTIVE_KEY, id)
  }

  return toSummary(stored, await getActiveId())
}

/**
 * Edits a profile in place, keeping its id so everything stored per profile (favorites, guide
 * sources, history) survives a rename or a provider moving to a new address.
 */
export async function updateProfile(
  id: string,
  input: UpdateProfileInput
): Promise<{ profile: IptvProfileSummary, accountChanged: boolean }> {
  const existing = await getProfileWithSecret(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found.' })
  }

  const serverUrl = normalizeServerUrl(input.serverUrl)
  const updated: StoredIptvProfile = {
    ...existing,
    name: input.name,
    serverUrl,
    username: input.username,
    passwordEncrypted: input.password ? encryptSecret(input.password) : existing.passwordEncrypted
  }
  await storage().setItem(`${PROFILE_PREFIX}${id}`, updated)

  // A new server or username may mean a different channel lineup; a new password doesn't.
  const accountChanged = serverUrl !== existing.serverUrl || input.username !== existing.username
  return { profile: toSummary(updated, await getActiveId()), accountChanged }
}

export async function deleteProfile(id: string): Promise<void> {
  await storage().removeItem(`${PROFILE_PREFIX}${id}`)

  const activeId = await getActiveId()
  if (activeId === id) {
    await storage().removeItem(ACTIVE_KEY)
  }
}

export async function setActiveProfile(id: string): Promise<void> {
  const existing = await storage().getItem<StoredIptvProfile>(`${PROFILE_PREFIX}${id}`)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found.' })
  }

  await storage().setItem(ACTIVE_KEY, id)
}

/** The active profile's id, or a 400 telling the client to set a profile up first. */
export async function requireActiveProfileId(): Promise<string> {
  const activeId = await getActiveId()
  if (!activeId) {
    throw createError({ statusCode: 400, statusMessage: 'No active IPTV profile. Add one in Profiles first.' })
  }
  return activeId
}

/** Internal only: includes the encrypted password, used to build outbound Xtream credentials. */
export async function getProfileWithSecret(id: string): Promise<StoredIptvProfile | null> {
  return await storage().getItem<StoredIptvProfile>(`${PROFILE_PREFIX}${id}`)
}

/** Internal only: includes the encrypted password, used to build outbound Xtream credentials. */
export async function getActiveProfileWithSecret(): Promise<StoredIptvProfile | null> {
  const activeId = await getActiveId()
  if (!activeId) return null
  return await getProfileWithSecret(activeId)
}
