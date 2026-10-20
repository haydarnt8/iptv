<script setup lang="ts">
import type { LiveStream } from '#shared/types/xtream'

const props = withDefaults(defineProps<{
  channel: LiveStream
  /** 'overlay' for use on top of video (always white). */
  appearance?: 'default' | 'overlay'
}>(), { appearance: 'default' })

const store = useLiveTvStore()
const toast = useToast()

const active = computed(() => store.isFavorite(props.channel.streamId))
const label = computed(() =>
  active.value ? `Remove ${props.channel.name} from favorites` : `Add ${props.channel.name} to favorites`
)

async function toggle() {
  try {
    await store.toggleFavorite(props.channel)
  } catch (error) {
    toast.add({ title: 'Couldn\'t update favorites', description: getErrorMessage(error), color: 'error' })
  }
}
</script>

<template>
  <button
    type="button"
    class="flex size-9 shrink-0 items-center justify-center rounded-md transition focus-visible:outline-2 focus-visible:outline-primary"
    :class="appearance === 'overlay'
      ? 'text-white hover:bg-white/10'
      : active ? 'text-primary hover:bg-elevated' : 'text-dimmed hover:bg-elevated hover:text-default'"
    :aria-label="label"
    :aria-pressed="active"
    :title="label"
    @click.stop="toggle"
  >
    <!-- Lucide's star, inlined so it can be filled when active (icon-font masks can't be). -->
    <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true">
      <path
        :fill="active ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z"
      />
    </svg>
  </button>
</template>
