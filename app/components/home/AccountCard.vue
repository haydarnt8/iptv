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
  <GroupedSection
    title="Account"
    :footer="account?.maxConnections === 1 ? 'Your plan allows one stream at a time: watching here stops other devices.' : undefined"
  >
    <GroupedRow :label="profileName" icon="i-lucide-user-round" icon-class="bg-gradient-to-br from-zinc-400 to-zinc-600" to="/profiles">
      <UBadge v-if="account" :color="isActive ? 'success' : 'warning'" variant="soft" size="sm">
        {{ account.status }}{{ account.isTrial ? ' · Trial' : '' }}
      </UBadge>
    </GroupedRow>

    <div v-if="loading" class="flex flex-col gap-2 px-4 py-3">
      <USkeleton class="h-4 w-2/3" />
      <USkeleton class="h-4 w-1/2" />
    </div>

    <GroupedRow v-else-if="failed" label="Couldn't reach your IPTV service right now." />

    <template v-else-if="account">
      <GroupedRow
        label="Subscription ends"
        icon="i-lucide-calendar"
        icon-class="bg-gradient-to-br from-orange-400 to-orange-600"
        :value="expiry?.label ?? 'No end date'"
      >
        <template v-if="expiry" #detail>
          <span :class="expiry.daysLeft <= 14 ? 'text-warning' : ''">
            {{ expiry.daysLeft > 0 ? `${expiry.daysLeft} days left` : 'Expired' }}
          </span>
        </template>
      </GroupedRow>
      <GroupedRow
        label="Devices at once"
        icon="i-lucide-monitor-smartphone"
        icon-class="bg-gradient-to-br from-sky-400 to-blue-600"
        :value="account.maxConnections?.toString() ?? 'Unknown'"
      />
    </template>
  </GroupedSection>
</template>
