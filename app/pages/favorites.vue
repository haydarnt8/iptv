<script setup lang="ts">
useSeoMeta({ title: 'Favorites - IPTV' })

const live = useLiveTvStore()
const { favorites } = storeToRefs(live)
const ready = ref(false)

onMounted(async () => {
  await live.loadPreferences()
  ready.value = true
})
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <h1 class="text-lg font-semibold">
      Favorites
    </h1>

    <div v-if="!ready" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <USkeleton v-for="i in 5" :key="i" class="aspect-video w-full" />
    </div>

    <EmptyState
      v-else-if="favorites.length === 0"
      icon="i-lucide-star"
      title="No favorites yet"
      description="Tap the star next to a channel in Live TV and it will show up here."
      action-label="Browse channels"
      action-to="/live"
    />

    <section v-else aria-labelledby="favorite-channels" class="flex flex-col gap-3">
      <h2 id="favorite-channels" class="text-base font-semibold text-highlighted">
        Channels <span class="font-normal text-muted">· {{ favorites.length }}</span>
      </h2>
      <LiveChannelGrid :channels="favorites" />
    </section>
  </div>
</template>
