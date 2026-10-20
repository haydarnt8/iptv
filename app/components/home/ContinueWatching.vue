<script setup lang="ts">
import type { LiveStream } from '#shared/types/xtream'

const props = defineProps<{
  channel: LiveStream
  now: number
}>()

const epg = useEpgStore()
const guide = computed(() => epg.nowNextFor(props.channel.streamId))
const current = computed(() => guide.value?.now ?? null)
const upcoming = computed(() => guide.value?.next ?? null)
const progress = computed(() => (current.value ? programmeProgress(current.value.start, current.value.stop, props.now) : 0))
</script>

<template>
  <section
    aria-label="Continue watching"
    class="relative overflow-hidden rounded-xl border border-default bg-gradient-to-br from-primary/20 via-elevated/60 to-default p-4 sm:p-6"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <LiveChannelLogo :src="channel.streamIcon" class="size-20 sm:size-28" />
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <p class="text-xs font-semibold uppercase tracking-wider text-primary">
          Continue watching
        </p>
        <h2 class="truncate text-xl font-bold text-highlighted sm:text-2xl">
          {{ channel.name }}
        </h2>
        <template v-if="current">
          <p class="truncate text-sm text-default">
            <span class="font-medium">{{ current.title }}</span>
            <span class="text-muted"> · {{ formatClock(current.start) }} – {{ formatClock(current.stop) }}</span>
          </p>
          <UProgress :model-value="progress" size="xs" class="max-w-md" :aria-label="`${Math.round(progress)}% through ${current.title}`" />
          <p v-if="upcoming" class="truncate text-xs text-muted">
            Next {{ formatClock(upcoming.start) }} · {{ upcoming.title }}
          </p>
        </template>
        <p v-else class="text-sm text-muted">
          Live now
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
          <UButton :to="{ path: '/live', query: { channel: channel.streamId } }" icon="i-lucide-play" size="lg">
            Watch now
          </UButton>
          <UButton to="/live/guide" icon="i-lucide-calendar-range" size="lg" variant="soft" color="neutral">
            TV Guide
          </UButton>
        </div>
      </div>
    </div>
  </section>
</template>
