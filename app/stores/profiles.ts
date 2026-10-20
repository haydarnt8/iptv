import { defineStore } from 'pinia'
import type { CreateIptvProfileInput, IptvProfileSummary, UpdateIptvProfileInput } from '#shared/types/profile'

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<IptvProfileSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeProfile = computed(() => profiles.value.find(profile => profile.isActive) ?? null)

  async function fetchProfiles() {
    loading.value = true
    error.value = null
    try {
      profiles.value = await $fetch('/api/profiles')
    } catch {
      error.value = 'Could not load profiles.'
    } finally {
      loading.value = false
    }
  }

  async function createProfile(input: CreateIptvProfileInput) {
    const profile = await $fetch('/api/profiles', { method: 'POST', body: input })
    await fetchProfiles()
    return profile
  }

  async function updateProfile(id: string, input: UpdateIptvProfileInput) {
    const profile = await $fetch<IptvProfileSummary>(`/api/profiles/${id}`, { method: 'PATCH', body: input })
    await fetchProfiles()
    return profile
  }

  async function deleteProfile(id: string) {
    await $fetch(`/api/profiles/${id}`, { method: 'DELETE' })
    await fetchProfiles()
  }

  async function setActive(id: string) {
    await $fetch(`/api/profiles/${id}/activate`, { method: 'POST' })
    await fetchProfiles()
  }

  return {
    profiles,
    loading,
    error,
    activeProfile,
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setActive
  }
})
