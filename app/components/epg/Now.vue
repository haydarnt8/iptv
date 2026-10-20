<script setup lang="ts">
const props = defineProps<{
  streamId: number
  channelName: string
}>()

const epg = useEpgStore()
const clock = useClock(15_000)
const showSchedule = ref(false)

const info = computed(() => epg.nowNextFor(props.streamId))
const current = computed(() => info.value?.now ?? null)
const upcoming = computed(() => info.value?.next ?? null)
const progress = computed(() =>
  current.value ? programmeProgress(current.value.start, current.value.stop, clock.value) : 0
)

// Once the current programme ends, ask for the new now/next for this channel.
watch(clock, (now) => {
  if (current.value && now >= current.value.stop) epg.loadNowNext([props.streamId])
})

watch(() => props.streamId, () => {
  showSchedule.value = false
})
</script>

<template>
  <section class="flex flex-col gap-2 rounded-lg border border-default bg-elevated/40 p-3" aria-label="Now playing">
    <div class="flex items-center justify-between gap-3">
      <p class="flex min-w-0 items-center gap-2 text-sm">
        <span class="size-2 shrink-0 rounded-full bg-error" aria-hidden="true" />
        <span class="truncate font-medium">{{ channelName }}</span>
      </p>
      <div class="flex shrink-0 items-center gap-1">
        <UButton
          v-if="info"
          size="xs"
          variant="ghost"
          color="neutral"
          :icon="showSchedule ? 'i-lucide-chevron-up' : 'i-lucide-calendar-clock'"
          :aria-expanded="showSchedule"
          @click="showSchedule = !showSchedule"
        >
          {{ showSchedule ? 'Hide schedule' : 'Schedule' }}
        </UButton>
        <slot name="actions" />
      </div>
    </div>

    <template v-if="current">
      <div class="flex items-start justify-between gap-3">
        <p class="line-clamp-2 min-w-0 font-semibold">
          {{ current.title }}
        </p>
        <span class="shrink-0 whitespace-nowrap pt-0.5 text-xs tabular-nums text-muted">
          {{ formatClock(current.start) }} – {{ formatClock(current.stop) }}
        </span>
      </div>
      <UProgress :model-value="progress" size="xs" :aria-label="`${Math.round(progress)}% through ${current.title}`" />
      <p v-if="current.description" class="line-clamp-2 text-sm text-muted">
        {{ current.description }}
      </p>
    </template>

    <p v-if="upcoming" class="truncate text-sm text-muted">
      <span class="font-medium text-default">Next {{ formatClock(upcoming.start) }}</span>
      · {{ upcoming.title }}
    </p>

    <p v-if="!info" class="text-sm text-muted">
      No programme guide for this channel.
      <ULink to="/settings" class="text-primary">
        Add guide sources
      </ULink>
    </p>

    <EpgSchedule v-if="showSchedule" :stream-id="streamId" />
  </section>
</template>
