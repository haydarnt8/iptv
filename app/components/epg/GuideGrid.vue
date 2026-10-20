<script setup lang="ts">
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { EpgProgramme } from '#shared/types/epg'
import type { LiveStream } from '#shared/types/xtream'

const props = defineProps<{
  channels: LiveStream[]
  playingId: number | null
}>()

const emit = defineEmits<{
  play: [channel: LiveStream]
  open: [programme: EpgProgramme, channel: LiveStream]
}>()

const MINUTE = 60_000
const SLOT_MINUTES = 30
const PX_PER_MINUTE = 4
const ROW_HEIGHT = 60
const HEADER_HEIGHT = 36
// The window starts a little in the past (rounded down to a slot) and spans a day.
const MINUTES_BEFORE_NOW = 60
const WINDOW_HOURS = 24
// Rows are fetched as they scroll into view, this many per request.
const FETCH_BATCH = 50
// Programmes this far outside the visible area are still rendered, so short scrolls don't flash.
const CULL_MARGIN_PX = 800

const api = useEpgApi()
const clock = useClock(30_000)

const windowStart = Math.floor((Date.now() - MINUTES_BEFORE_NOW * MINUTE) / (SLOT_MINUTES * MINUTE)) * SLOT_MINUTES * MINUTE
const windowEnd = windowStart + WINDOW_HOURS * 60 * MINUTE
const timelineWidth = WINDOW_HOURS * 60 * PX_PER_MINUTE
const slots = Array.from({ length: (WINDOW_HOURS * 60) / SLOT_MINUTES }, (_, i) => windowStart + i * SLOT_MINUTES * MINUTE)

const WIDE_CHANNEL_WIDTH = 200
const NARROW_CHANNEL_WIDTH = 104
const channelWidth = ref(WIDE_CHANNEL_WIDTH)
const scrollRef = ref<HTMLElement | null>(null)
const viewport = ref({ left: 0, width: 0 })

function x(time: number) {
  return ((time - windowStart) / MINUTE) * PX_PER_MINUTE
}

const virtualizer = useVirtualizer(computed(() => ({
  count: props.channels.length,
  getScrollElement: () => scrollRef.value,
  estimateSize: () => ROW_HEIGHT,
  overscan: 6,
  // Rows start below the sticky time header.
  scrollMargin: HEADER_HEIGHT
})))

const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const renderedRows = computed(() =>
  virtualRows.value.flatMap((row) => {
    const channel = props.channels[row.index]
    return channel ? [{ start: row.start, channel }] : []
  })
)
const totalHeight = computed(() => virtualizer.value.getTotalSize())

// --- Horizontal culling ---

let scrollFrame = 0
function onScroll() {
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    const el = scrollRef.value
    if (el) viewport.value = { left: el.scrollLeft, width: el.clientWidth }
  })
}

const visibleFrom = computed(() => windowStart + ((viewport.value.left - CULL_MARGIN_PX) / PX_PER_MINUTE) * MINUTE)
const visibleTo = computed(() => windowStart + ((viewport.value.left + viewport.value.width + CULL_MARGIN_PX) / PX_PER_MINUTE) * MINUTE)

// --- Data: fetched per visible rows, cached for the life of the page ---

const programmesByStream = shallowRef(new Map<number, EpgProgramme[]>())
const requested = new Set<number>()
let fetchTimer: ReturnType<typeof setTimeout> | null = null

async function fetchVisibleRows() {
  const ids = renderedRows.value
    .map(row => row.channel.streamId)
    .filter(id => !requested.has(id))
  if (!ids.length) return
  ids.forEach(id => requested.add(id))

  for (let i = 0; i < ids.length; i += FETCH_BATCH) {
    const batch = ids.slice(i, i + FETCH_BATCH)
    try {
      const rows = await api.getGrid(batch, windowStart, windowEnd)
      const next = new Map(programmesByStream.value)
      for (const id of batch) next.set(id, [])
      for (const row of rows) next.set(row.streamId, row.programmes)
      programmesByStream.value = next
    } catch {
      // Let the next scroll retry these rows.
      batch.forEach(id => requested.delete(id))
    }
  }
}

watch(virtualRows, () => {
  if (fetchTimer) clearTimeout(fetchTimer)
  fetchTimer = setTimeout(fetchVisibleRows, 120)
})

function visibleProgrammes(streamId: number): EpgProgramme[] {
  const list = programmesByStream.value.get(streamId) ?? []
  return list.filter(programme => programme.stop > visibleFrom.value && programme.start < visibleTo.value)
}

function programmeStyle(programme: EpgProgramme) {
  const start = Math.max(programme.start, windowStart)
  const stop = Math.min(programme.stop, windowEnd)
  return { left: `${x(start)}px`, width: `${Math.max(x(stop) - x(start) - 2, 2)}px` }
}

function programmeState(programme: EpgProgramme): 'past' | 'live' | 'future' {
  if (programme.stop <= clock.value) return 'past'
  return programme.start <= clock.value ? 'live' : 'future'
}

// --- Navigation ---

/** Scrolls so "now" sits a little in from the left edge. */
function scrollToNow(behavior: ScrollBehavior = 'smooth') {
  scrollRef.value?.scrollTo({ left: Math.max(0, x(clock.value) - 30 * PX_PER_MINUTE), behavior })
}

function scrollToTop() {
  scrollRef.value?.scrollTo({ top: 0 })
}

defineExpose({ scrollToNow, scrollToTop })

/** The day at the left edge of the visible timeline. */
const dayLabel = computed(() => formatDay(windowStart + (viewport.value.left / PX_PER_MINUTE) * MINUTE, clock.value))
const nowVisible = computed(() => clock.value >= windowStart && clock.value < windowEnd)

let mediaQuery: MediaQueryList | null = null
function updateChannelWidth() {
  channelWidth.value = mediaQuery?.matches ? WIDE_CHANNEL_WIDTH : NARROW_CHANNEL_WIDTH
}

onMounted(() => {
  mediaQuery = window.matchMedia('(min-width: 640px)')
  updateChannelWidth()
  mediaQuery.addEventListener('change', updateChannelWidth)
  onScroll()
  nextTick(() => scrollToNow('instant'))
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', updateChannelWidth)
  if (fetchTimer) clearTimeout(fetchTimer)
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <div
    ref="scrollRef"
    class="relative overflow-auto rounded-lg border border-default bg-default outline-none focus-visible:ring-2 focus-visible:ring-primary"
    tabindex="0"
    role="region"
    aria-label="TV guide"
    @scroll.passive="onScroll"
  >
    <div class="relative" :style="{ width: `${channelWidth + timelineWidth}px`, height: `${HEADER_HEIGHT + totalHeight}px` }">
      <!-- Time header -->
      <div
        class="sticky top-0 z-30 flex border-b border-default bg-default/95 backdrop-blur"
        :style="{ height: `${HEADER_HEIGHT}px` }"
      >
        <div
          class="sticky left-0 z-10 flex shrink-0 items-center border-r border-default bg-default px-3 text-xs font-semibold text-muted"
          :style="{ width: `${channelWidth}px` }"
        >
          <span class="truncate">{{ dayLabel }}</span>
        </div>
        <div class="relative" :style="{ width: `${timelineWidth}px` }">
          <span
            v-for="slot in slots"
            :key="slot"
            class="absolute top-0 flex h-full items-center border-l border-default pl-2 text-xs tabular-nums text-muted"
            :style="{ left: `${x(slot)}px`, width: `${SLOT_MINUTES * PX_PER_MINUTE}px` }"
          >
            {{ formatClock(slot) }}
          </span>
          <span
            v-if="nowVisible"
            class="absolute bottom-0 h-2 w-0.5 bg-primary"
            :style="{ left: `${x(clock)}px` }"
            aria-hidden="true"
          />
        </div>
      </div>

      <!-- Rows. Each row's transform makes it a stacking context, so the "now" line is drawn per row
           (between the programmes and the sticky channel column) rather than once over everything. -->
      <div
        v-for="{ start, channel } in renderedRows"
        :key="channel.streamId"
        class="absolute left-0 top-0 flex"
        :style="{ transform: `translateY(${start}px)`, height: `${ROW_HEIGHT}px`, width: `${channelWidth + timelineWidth}px` }"
      >
        <button
          type="button"
          class="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-b border-default px-2 text-left transition hover:bg-elevated focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          :class="channel.streamId === playingId ? 'bg-[color-mix(in_oklab,var(--ui-primary)_14%,var(--ui-bg))] text-primary' : 'bg-default'"
          :style="{ width: `${channelWidth}px` }"
          :title="`Watch ${channel.name}`"
          :aria-label="`Watch ${channel.name}`"
          @click="emit('play', channel)"
        >
          <!-- Phones get the name only: the column is too narrow for both. -->
          <LiveChannelLogo v-if="channelWidth > NARROW_CHANNEL_WIDTH" :src="channel.streamIcon" class="size-9" />
          <span class="line-clamp-2 min-w-0 text-xs font-medium">{{ channel.name }}</span>
        </button>

        <div class="relative border-b border-default" :style="{ width: `${timelineWidth}px` }">
          <template v-if="programmesByStream.has(channel.streamId)">
            <button
              v-for="programme in visibleProgrammes(channel.streamId)"
              :key="programme.start"
              type="button"
              class="absolute inset-y-1 flex flex-col justify-center overflow-clip rounded-md border px-2 text-left transition focus-visible:outline-2 focus-visible:outline-primary"
              :class="{
                'border-default bg-elevated/30 text-muted hover:bg-elevated': programmeState(programme) === 'past',
                'border-primary/50 bg-primary/15 hover:bg-primary/25': programmeState(programme) === 'live',
                'border-default bg-elevated hover:bg-accented': programmeState(programme) === 'future'
              }"
              :style="programmeStyle(programme)"
              :aria-label="`${programme.title}, ${formatClock(programme.start)} to ${formatClock(programme.stop)} on ${channel.name}`"
              @click="emit('open', programme, channel)"
            >
              <!-- Sticky so a long programme's title stays readable while scrolling sideways. -->
              <span class="sticky block w-fit max-w-full truncate text-sm font-medium" :style="{ left: `${channelWidth + 8}px` }">
                {{ programme.title }}
              </span>
              <span class="sticky block w-fit max-w-full truncate text-xs tabular-nums text-muted" :style="{ left: `${channelWidth + 8}px` }">
                {{ formatClock(programme.start) }} – {{ formatClock(programme.stop) }}
              </span>
            </button>
            <p
              v-if="!programmesByStream.get(channel.streamId)?.length"
              class="sticky flex h-full w-max items-center px-3 text-xs text-dimmed"
              :style="{ left: `${channelWidth}px` }"
            >
              No guide information
            </p>
          </template>
          <USkeleton
            v-else
            class="sticky top-1 h-[calc(100%-0.5rem)] w-64"
            :style="{ left: `${channelWidth + 4}px` }"
          />
          <span
            v-if="nowVisible"
            class="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-primary"
            :style="{ left: `${x(clock)}px` }"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
