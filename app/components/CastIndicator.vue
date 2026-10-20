<script setup lang="ts">
// Header control while casting, so the TV can be paused or stopped from any page.
const cast = useCastStore()

onMounted(() => {
  // Picks up a session this app already has on the TV (e.g. after a reload).
  cast.init()
})
</script>

<template>
  <UPopover v-if="cast.connected">
    <UButton
      icon="i-lucide-cast"
      variant="soft"
      size="sm"
      :aria-label="`Casting to ${cast.deviceName ?? 'TV'}`"
    >
      <span class="hidden max-w-32 truncate sm:inline">{{ cast.deviceName ?? 'TV' }}</span>
    </UButton>

    <template #content>
      <div class="flex w-64 flex-col gap-3 p-3">
        <div class="min-w-0">
          <p class="text-xs text-muted">
            Casting to {{ cast.deviceName ?? 'your TV' }}
          </p>
          <p class="truncate text-sm font-semibold">
            {{ cast.media?.title ?? 'Nothing playing' }}
          </p>
          <p v-if="cast.error" class="mt-1 text-xs text-error">
            {{ cast.error }}
          </p>
        </div>
        <div class="flex gap-2">
          <UButton
            v-if="cast.media"
            size="sm"
            variant="soft"
            color="neutral"
            :icon="cast.isPaused ? 'i-lucide-play' : 'i-lucide-pause'"
            @click="cast.togglePlay"
          >
            {{ cast.isPaused ? 'Play' : 'Pause' }}
          </UButton>
          <UButton size="sm" variant="soft" color="error" icon="i-lucide-square" @click="cast.disconnect">
            Stop casting
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
