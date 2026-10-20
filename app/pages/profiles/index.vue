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

// Deleting asks first, in an Apple-style alert.
const deleteTarget = shallowRef<IptvProfileSummary | null>(null)
const deleting = ref(false)
const deleteOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (open: boolean) => {
    if (!open) deleteTarget.value = null
  }
})

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return
  deleting.value = true
  try {
    const wasActive = profilesStore.activeProfile?.id === target.id
    await profilesStore.deleteProfile(target.id)
    deleteTarget.value = null
    if (wasActive) reloadNuxtApp()
  } finally {
    deleting.value = false
  }
}

function hostOf(serverUrl: string): string {
  try {
    return new URL(serverUrl).host
  } catch {
    return serverUrl
  }
}

function menuItems(profile: IptvProfileSummary) {
  return [
    { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(profile) },
    { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => { deleteTarget.value = profile } }
  ]
}
</script>

<template>
  <div class="flex w-full max-w-3xl flex-1 flex-col gap-8">
    <PageTitle title="Profiles">
      <template #actions>
        <UButton icon="i-lucide-plus" @click="openAdd">
          Add Profile
        </UButton>
      </template>
    </PageTitle>

    <div v-if="loading && profiles.length === 0" class="flex flex-col gap-2">
      <USkeleton class="h-4 w-24" />
      <USkeleton class="h-32 w-full rounded-2xl" />
    </div>

    <EmptyState
      v-else-if="profiles.length === 0"
      icon="i-lucide-users"
      title="No Profiles Yet"
      description="Add your Xtream-compatible IPTV subscription to get started."
      action-label="Add Profile"
      @action="openAdd"
    />

    <GroupedSection
      v-else
      footer="The active profile is used for Live TV, Movies, Series and the guide. Passwords are encrypted on this computer and never sent to the browser."
    >
      <div v-for="profile in profiles" :key="profile.id" class="flex items-center gap-3 px-4 py-3">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
          :class="profile.isActive ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-zinc-400 to-zinc-600'"
          aria-hidden="true"
        >
          {{ profile.name.slice(0, 1).toUpperCase() }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-2 text-[15px] text-highlighted">
            <span class="truncate">{{ profile.name }}</span>
            <UBadge v-if="profile.isActive" color="success" variant="soft" size="sm">
              Active
            </UBadge>
          </p>
          <p class="truncate text-[13px] text-muted">
            {{ hostOf(profile.serverUrl) }} · {{ profile.username }}
          </p>
        </div>
        <UButton v-if="!profile.isActive" size="sm" variant="soft" color="neutral" @click="handleSetActive(profile.id)">
          Use
        </UButton>
        <UDropdownMenu :items="menuItems(profile)" :content="{ align: 'end' }">
          <UButton icon="i-lucide-ellipsis" size="sm" variant="ghost" color="neutral" :aria-label="`More actions for ${profile.name}`" />
        </UDropdownMenu>
      </div>
    </GroupedSection>

    <ProfileFormModal v-model:open="modalOpen" :profile="editingProfile" @saved="onSaved" />

    <UModal v-model:open="deleteOpen" :title="`Delete \u201C${deleteTarget?.name ?? ''}\u201D?`" :ui="{ content: 'max-w-sm' }">
      <template #body>
        <p class="text-[15px] text-muted">
          Its favorites, history and guide settings are deleted too. This can't be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full gap-2">
          <UButton block variant="soft" color="neutral" @click="deleteTarget = null">
            Cancel
          </UButton>
          <UButton block color="error" :loading="deleting" @click="confirmDelete">
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
