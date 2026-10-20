<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { IptvProfileSummary, XtreamConnectionTestResult } from '#shared/types/profile'

const props = withDefaults(defineProps<{
  /** Set to edit this profile; omit to add a new one. */
  profile?: IptvProfileSummary | null
}>(), { profile: null })

const emit = defineEmits<{
  /** `connectionChanged`: the server, username or password changed (not just the name). */
  saved: [profile: IptvProfileSummary, connectionChanged: boolean]
}>()

const open = defineModel<boolean>('open', { default: false })

const isEdit = computed(() => props.profile !== null)

const schema = computed(() => z.object({
  name: z.string().trim().min(1, 'Profile name is required.').max(60, 'Profile name is too long.'),
  serverUrl: z.string().trim().url('Must be a valid URL, including http:// or https://'),
  username: z.string().trim().min(1, 'Username is required.'),
  // The stored password is never sent to the browser, so editing can't prefill it: blank keeps it.
  password: isEdit.value ? z.string() : z.string().min(1, 'Password is required.')
}))

type Schema = z.infer<typeof schema.value>

const state = reactive<Schema>({
  name: '',
  serverUrl: '',
  username: '',
  password: ''
})

const showPassword = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref<XtreamConnectionTestResult | null>(null)

const toast = useToast()
const profilesStore = useProfilesStore()

async function testConnection() {
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await $fetch('/api/profiles/test', {
      method: 'POST',
      body: {
        serverUrl: state.serverUrl,
        username: state.username,
        password: state.password || undefined,
        profileId: props.profile?.id
      }
    })
  } catch (error) {
    testResult.value = { ok: false, message: getErrorMessage(error) }
  } finally {
    testing.value = false
  }
}

function withoutTrailingSlash(url: string) {
  return url.trim().replace(/\/+$/, '')
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    const existing = props.profile
    if (existing) {
      const saved = await profilesStore.updateProfile(existing.id, {
        ...event.data,
        password: event.data.password || undefined
      })
      const connectionChanged = withoutTrailingSlash(event.data.serverUrl) !== existing.serverUrl
        || event.data.username !== existing.username
        || !!event.data.password
      toast.add({ title: 'Profile updated', color: 'success' })
      emit('saved', saved, connectionChanged)
    } else {
      const saved = await profilesStore.createProfile(event.data)
      toast.add({ title: 'Profile saved', color: 'success' })
      emit('saved', saved, true)
    }
    open.value = false
  } catch (error) {
    toast.add({ title: 'Could not save profile', description: getErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

function resetForm() {
  state.name = props.profile?.name ?? ''
  state.serverUrl = props.profile?.serverUrl ?? ''
  state.username = props.profile?.username ?? ''
  state.password = ''
  testResult.value = null
  showPassword.value = false
}

// Fill (edit) or clear (add) the form each time it opens.
watch(open, (isOpen) => {
  if (isOpen) resetForm()
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? 'Edit IPTV profile' : 'Add IPTV profile'"
    :description="isEdit
      ? 'Your favorites, history and guide settings stay with this profile.'
      : 'Enter the details for your Xtream-compatible service.'"
  >
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Profile name" name="name">
          <UInput v-model="state.name" placeholder="My IPTV" class="w-full" />
        </UFormField>

        <UFormField label="Server URL" name="serverUrl">
          <UInput v-model="state.serverUrl" placeholder="http://example.com:8080" class="w-full" />
        </UFormField>

        <UFormField label="Username" name="username">
          <UInput v-model="state.username" autocomplete="off" class="w-full" />
        </UFormField>

        <UFormField
          label="Password"
          name="password"
          :description="isEdit ? 'Leave blank to keep the current password.' : undefined"
        >
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="isEdit ? '••••••••' : undefined"
            autocomplete="off"
            class="w-full"
          >
            <template #trailing>
              <UButton
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                variant="link"
                color="neutral"
                size="sm"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <div class="flex items-center gap-3">
          <UButton variant="soft" color="neutral" :loading="testing" @click="testConnection">
            Test connection
          </UButton>
          <span
            v-if="testResult"
            class="text-sm"
            :class="testResult.ok ? 'text-success' : 'text-error'"
          >
            {{ testResult.message }}
          </span>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton variant="ghost" color="neutral" @click="open = false">
            Cancel
          </UButton>
          <UButton type="submit" :loading="saving">
            {{ isEdit ? 'Save changes' : 'Save profile' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
