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
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-base font-semibold text-highlighted">
        {{ title }}
      </h2>
      <UButton v-if="seeAllTo" :to="seeAllTo" size="xs" variant="ghost" color="neutral" trailing-icon="i-lucide-chevron-right">
        See all
      </UButton>
    </div>
    <!-- Bleeds to the screen edge on phones so the next card peeks in, hinting at the scroll. -->
    <div class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0 md:scroll-px-0">
      <LiveChannelCard
        v-for="channel in channels"
        :key="channel.streamId"
        :channel="channel"
        :guide="epg.nowNextFor(channel.streamId)"
        :now="now"
        class="w-40 shrink-0 snap-start sm:w-48"
      />
    </div>
  </section>
</template>
