<script setup lang="ts">
import type { EpgNowNext } from '#shared/types/epg'
import type { LiveStream } from '#shared/types/xtream'

const props = defineProps<{
  channel: LiveStream
  guide: EpgNowNext | null
  now: number
}>()

const current = computed(() => props.guide?.now ?? null)
const progress = computed(() => (current.value ? programmeProgress(current.value.start, current.value.stop, props.now) : 0))
</script>

<template>
  <NuxtLink
    :to="{ path: '/live', query: { channel: channel.streamId } }"
    class="group flex min-w-0 flex-col gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
    :aria-label="current ? `Watch ${channel.name}, now: ${current.title}` : `Watch ${channel.name}`"
  >
    <span class="relative flex aspect-video items-center justify-center rounded-lg border border-default bg-elevated/60 transition group-hover:border-primary/60 group-hover:bg-elevated">
      <LiveChannelLogo :src="channel.streamIcon" class="size-14" />
      <span class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        <UIcon name="i-lucide-play" class="size-8 text-white" />
      </span>
      <span v-if="current" class="absolute inset-x-2 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
        <span class="block h-full rounded-full bg-primary" :style="{ width: `${progress}%` }" />
      </span>
    </span>
    <span class="flex min-w-0 flex-col px-0.5">
      <span class="truncate text-sm font-medium text-highlighted">{{ channel.name }}</span>
      <span class="truncate text-xs text-muted">{{ current?.title ?? 'Live' }}</span>
    </span>
  </NuxtLink>
</template>
