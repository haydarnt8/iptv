<script setup lang="ts">
import type { IptvProfileSummary } from '#shared/types/profile'

useSeoMeta({ title: 'Profiles - IPTV' })

const profilesStore = useProfilesStore()
const { profiles, loading } = storeToRefs(profilesStore)

const modalOpen = ref(false)
// null while adding a new profile.
const editingProfile = shallowRef<IptvProfileSummary | null>(null)

function openAdd() {
  editingProfile.value = null
  modalOpen.value = true
}

function openEdit(profile: IptvProfileSummary) {
  editingProfile.value = profile
  modalOpen.value = true
}

// The active profile's catalogs and guide came from the old connection details.
function onSaved(profile: IptvProfileSummary, connectionChanged: boolean) {
  if (profile.isActive && connectionChanged) reloadNuxtApp()
}

onMounted(() => {
  profilesStore.fetchProfiles()
})

// Catalogs, favorites and the guide all belong to the active profile, so start
// from a clean app state whenever it changes.
async function handleSetActive(id: string) {
  await profilesStore.setActive(id)
  reloadNuxtApp()
}

async function handleDelete(id: string, name: string) {
  if (!confirm(`Delete profile "${name}"? This can't be undone.`)) {
    return
  }
  const wasActive = profilesStore.activeProfile?.id === id
  await profilesStore.deleteProfile(id)
  if (wasActive) reloadNuxtApp()
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">
        IPTV Profiles
      </h1>
      <UButton icon="i-lucide-plus" @click="openAdd">
        Add profile
      </UButton>
    </div>

    <div v-if="loading" class="grid gap-3 sm:grid-cols-2">
      <USkeleton v-for="i in 2" :key="i" class="h-28 w-full" />
    </div>

    <EmptyState
      v-else-if="profiles.length === 0"
      icon="i-lucide-users"
      title="No profiles yet"
      description="Add your Xtream-compatible IPTV subscription to get started."
      action-label="Add a profile"
      @action="openAdd"
    />

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <UCard v-for="profile in profiles" :key="profile.id">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="truncate font-medium">{{ profile.name }}</span>
            <UBadge v-if="profile.isActive" color="primary" variant="subtle" size="sm">
              Active
            </UBadge>
          </div>
          <p class="truncate text-sm text-muted">
            {{ profile.serverUrl }}
          </p>
          <p class="truncate text-sm text-muted">
            {{ profile.username }}
          </p>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            v-if="!profile.isActive"
            size="sm"
            variant="soft"
            @click="handleSetActive(profile.id)"
          >
            Set active
          </UButton>
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-lucide-pencil"
            :aria-label="`Edit ${profile.name}`"
            @click="openEdit(profile)"
          >
            Edit
          </UButton>
          <UButton
            size="sm"
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            @click="handleDelete(profile.id, profile.name)"
          >
            Delete
          </UButton>
        </div>
      </UCard>
    </div>

    <ProfileFormModal v-model:open="modalOpen" :profile="editingProfile" @saved="onSaved" />
  </div>
</template>
