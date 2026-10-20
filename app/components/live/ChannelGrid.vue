<script setup lang="ts">
import type { LiveStream } from '#shared/types/xtream'

// The now/next endpoint accepts up to 1000 channels per request.
const MAX_GUIDE_REQUEST = 1000

const props = defineProps<{ channels: LiveStream[] }>()

const epg = useEpgStore()
const clock = useClock(30_000)

function loadGuide() {
  epg.loadNowNext(props.channels.slice(0, MAX_GUIDE_REQUEST).map(channel => channel.streamId))
}

watch(() => props.channels, loadGuide)

let guideTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  loadGuide()
  guideTimer = setInterval(loadGuide, 60_000)
})
onBeforeUnmount(() => {
  if (guideTimer) clearInterval(guideTimer)
})
</script>

<template>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-4 gap-y-6">
    <LiveChannelCard
      v-for="channel in channels"
      :key="channel.streamId"
      :channel="channel"
      :guide="epg.nowNextFor(channel.streamId)"
      :now="clock"
    />
  </div>
</template>
