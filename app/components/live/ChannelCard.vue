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
    class="group flex min-w-0 flex-col gap-2.5 rounded-xl outline-none"
    :aria-label="current ? `Watch ${channel.name}, now: ${current.title}` : `Watch ${channel.name}`"
  >
    <!-- Lifts on hover, like Apple TV tiles. -->
    <span
      class="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-(--logo-tile) ring-[0.5px] ring-default transition duration-300 ease-spring group-hover:-translate-y-1 group-hover:shadow-card group-focus-visible:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-primary group-active:scale-[0.98]"
    >
      <LiveChannelLogo :src="channel.streamIcon" class="size-3/5" />
      <span class="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-md transition group-hover:opacity-100 group-focus-visible:opacity-100">
        <UIcon name="i-lucide-play" class="size-4" />
      </span>
      <span v-if="current" class="absolute inset-x-3 bottom-2 h-[3px] overflow-hidden rounded-full bg-black/10 transition-[right] group-hover:right-12 dark:bg-white/20" aria-hidden="true">
        <span class="block h-full rounded-full bg-primary" :style="{ width: `${progress}%` }" />
      </span>
    </span>
    <span class="flex min-w-0 flex-col px-0.5">
      <span class="truncate text-[15px] font-medium text-highlighted">{{ channel.name }}</span>
      <span class="truncate text-[13px] text-muted">{{ current?.title ?? 'Live' }}</span>
    </span>
  </NuxtLink>
</template>
