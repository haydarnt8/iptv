<script setup lang="ts">
import type { LiveStream } from '#shared/types/xtream'

defineProps<{
  title: string
  channels: LiveStream[]
  now: number
  seeAllTo?: string
}>()

const epg = useEpgStore()
</script>

<template>
  <section class="flex flex-col gap-3" :aria-label="title">
    <div class="flex items-baseline justify-between gap-2">
      <h2 class="text-xl font-bold tracking-tight text-highlighted">
        {{ title }}
      </h2>
      <NuxtLink v-if="seeAllTo" :to="seeAllTo" class="rounded text-[15px] text-accent outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary">
        See All
      </NuxtLink>
    </div>
    <!-- Bleeds to the screen edge so the next card peeks in, hinting at the scroll. -->
    <div class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none] md:-mx-6 md:scroll-px-6 md:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8">
      <LiveChannelCard
        v-for="channel in channels"
        :key="channel.streamId"
        :channel="channel"
        :guide="epg.nowNextFor(channel.streamId)"
        :now="now"
        class="w-44 shrink-0 snap-start sm:w-56"
      />
    </div>
  </section>
</template>
