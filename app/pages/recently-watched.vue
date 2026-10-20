<script setup lang="ts">
useSeoMeta({ title: 'Recently Watched - IPTV' })

const live = useLiveTvStore()
const { recentChannels } = storeToRefs(live)
const ready = ref(false)

onMounted(async () => {
  await live.loadPreferences()
  ready.value = true
})
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <h1 class="text-lg font-semibold">
      Recently Watched
    </h1>

    <div v-if="!ready" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <USkeleton v-for="i in 5" :key="i" class="aspect-video w-full" />
    </div>

    <EmptyState
      v-else-if="recentChannels.length === 0"
      icon="i-lucide-history"
      title="Nothing watched yet"
      description="Channels you watch will show up here, most recent first."
      action-label="Browse channels"
      action-to="/live"
    />

    <section v-else aria-labelledby="recent-channels" class="flex flex-col gap-3">
      <h2 id="recent-channels" class="text-base font-semibold text-highlighted">
        Channels
      </h2>
      <LiveChannelGrid :channels="recentChannels" />
    </section>
  </div>
</template>
