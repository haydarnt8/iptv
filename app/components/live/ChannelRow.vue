<script setup lang="ts">
import type { EpgNowNext } from '#shared/types/epg'
import type { LiveStream } from '#shared/types/xtream'

const props = defineProps<{
  channel: LiveStream
  playing: boolean
  guide: EpgNowNext | null
  /** Current time (ms), passed in so every row shares one clock. */
  now: number
}>()

defineEmits<{ play: [] }>()

const current = computed(() => props.guide?.now ?? null)
const progress = computed(() => (current.value ? programmeProgress(current.value.start, current.value.stop, props.now) : 0))
</script>

<template>
  <div
    class="group/row flex h-full items-center gap-1 rounded-lg pr-1 transition"
    :class="playing ? 'bg-primary/10 ring-1 ring-primary/40 ring-inset' : 'hover:bg-elevated'"
    :data-stream-id="channel.streamId"
  >
    <button
      type="button"
      class="flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
      data-channel-button
      :aria-current="playing ? 'true' : undefined"
      @click="$emit('play')"
    >
      <LiveChannelLogo :src="channel.streamIcon" class="size-11" />
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="flex items-center gap-1.5">
          <UIcon v-if="playing" name="i-lucide-audio-lines" class="size-4 shrink-0 text-primary" aria-label="Playing" />
          <span class="truncate text-sm font-medium" :class="playing ? 'text-primary' : 'text-highlighted'">
            {{ channel.name }}
          </span>
        </span>
        <template v-if="current">
          <span class="truncate text-xs text-muted">{{ current.title }}</span>
          <span class="h-0.5 w-full overflow-hidden rounded-full bg-accented" aria-hidden="true">
            <span class="block h-full rounded-full bg-primary/70" :style="{ width: `${progress}%` }" />
          </span>
        </template>
      </span>
    </button>
    <LiveFavoriteButton :channel="channel" />
  </div>
</template>
