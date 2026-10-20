<script setup lang="ts">
import type { XtreamAccountInfo } from '#shared/types/profile'

defineProps<{ profileName: string }>()

const xtream = useXtreamApi()
const account = ref<XtreamAccountInfo | null>(null)
const loading = ref(true)
const failed = ref(false)

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const expiry = computed(() => {
  const expiresAt = account.value?.expiresAt
  if (!expiresAt) return null
  const time = Date.parse(expiresAt)
  const daysLeft = Math.ceil((time - Date.now()) / 86_400_000)
  return { label: dateFormat.format(time), daysLeft }
})

const isActive = computed(() => account.value?.status.toLowerCase() === 'active')

onMounted(async () => {
  try {
    account.value = await xtream.getAccountInfo()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <UCard :ui="{ body: 'flex flex-col gap-3' }">
    <div class="flex items-center justify-between gap-2">
      <h2 class="flex min-w-0 items-center gap-2 font-semibold text-highlighted">
        <UIcon name="i-lucide-user-round" class="size-4 shrink-0 text-muted" />
        <span class="truncate">{{ profileName }}</span>
      </h2>
      <UBadge v-if="account" :color="isActive ? 'success' : 'warning'" variant="subtle">
        {{ account.status }}{{ account.isTrial ? ' · Trial' : '' }}
      </UBadge>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <USkeleton class="h-4 w-2/3" />
      <USkeleton class="h-4 w-1/2" />
    </div>

    <p v-else-if="failed" class="text-sm text-muted">
      Couldn't reach your IPTV service right now.
    </p>

    <dl v-else-if="account" class="grid grid-cols-2 gap-3 text-sm">
      <div>
        <dt class="text-xs text-muted">
          Subscription ends
        </dt>
        <dd v-if="expiry" class="font-medium" :class="expiry.daysLeft <= 14 ? 'text-warning' : 'text-highlighted'">
          {{ expiry.label }}
          <span class="block text-xs font-normal text-muted">
            {{ expiry.daysLeft > 0 ? `${expiry.daysLeft} days left` : 'Expired' }}
          </span>
        </dd>
        <dd v-else class="font-medium text-highlighted">
          No end date
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Devices at once
        </dt>
        <dd class="font-medium text-highlighted">
          {{ account.maxConnections ?? 'Unknown' }}
          <span v-if="account.maxConnections === 1" class="block text-xs font-normal text-muted">
            Watching here stops other devices
          </span>
        </dd>
      </div>
    </dl>

    <UButton to="/profiles" size="xs" variant="link" color="neutral" class="self-start px-0">
      Manage profiles
    </UButton>
  </UCard>
</template>
