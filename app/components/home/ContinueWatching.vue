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
  <!-- Apple TV–style hero: the artwork, huge and blurred, becomes the ambient background. -->
  <section aria-label="Continue watching" class="relative isolate overflow-hidden rounded-3xl bg-elevated shadow-card">
    <img
      v-if="channel.streamIcon"
      :src="channel.streamIcon"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 -z-10 size-full scale-150 object-cover opacity-50 blur-3xl saturate-150"
    >
    <div class="absolute inset-0 -z-10 bg-gradient-to-r from-elevated via-elevated/85 to-elevated/40" />

    <div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
      <LiveChannelLogo :src="channel.streamIcon" class="size-24 rounded-[22px] bg-(--logo-tile) shadow-card ring-[0.5px] ring-default sm:size-36 sm:rounded-[28px]" />
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <p class="text-[13px] font-semibold uppercase tracking-wide text-accent">
          Continue Watching
        </p>
        <h2 class="truncate text-2xl font-bold tracking-tight text-highlighted sm:text-[2rem] sm:leading-tight">
          {{ channel.name }}
        </h2>
        <template v-if="current">
          <p class="truncate text-[15px]">
            <span class="font-medium text-highlighted">{{ current.title }}</span>
            <span class="text-muted"> · {{ formatClock(current.start) }} – {{ formatClock(current.stop) }}</span>
          </p>
          <div class="h-1 max-w-md overflow-hidden rounded-full bg-accented" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100" :aria-label="`Progress through ${current.title}`">
            <div class="h-full rounded-full bg-primary transition-[width] duration-700" :style="{ width: `${progress}%` }" />
          </div>
          <p v-if="upcoming" class="truncate text-[13px] text-muted">
            Up next at {{ formatClock(upcoming.start) }} · {{ upcoming.title }}
          </p>
        </template>
        <p v-else class="text-[15px] text-muted">
          Live now
        </p>
        <div class="mt-3 flex flex-wrap gap-2.5">
          <UButton :to="{ path: '/live', query: { channel: channel.streamId } }" icon="i-lucide-play" size="xl" class="px-6">
            Watch
          </UButton>
          <UButton to="/live/guide" icon="i-lucide-calendar-range" size="xl" variant="soft" color="neutral" class="bg-default/60 px-5 backdrop-blur">
            TV Guide
          </UButton>
        </div>
      </div>
    </div>
  </section>
</template>
