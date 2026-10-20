<script setup lang="ts" generic="T">
import { useWindowVirtualizer } from '@tanstack/vue-virtual'

const props = withDefaults(
  defineProps<{
    items: T[]
    itemKey: (item: T) => string | number
    /** Columns are added while each can stay at least this wide (px). */
    minColumnWidth: number
    /** Height of one cell (px) for a given column width; rows are fixed-height. */
    itemHeight: (columnWidth: number) => number
    gap?: number
  }>(),
  { gap: 12 }
)

defineSlots<{ default(props: { item: T }): unknown }>()

const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
// Distance from the top of the document to the grid: the page itself scrolls
// (not the grid), so row offsets are relative to the document.
const scrollMargin = ref(0)

const columns = computed(() =>
  Math.max(1, Math.floor((containerWidth.value + props.gap) / (props.minColumnWidth + props.gap)))
)
const columnWidth = computed(() => (containerWidth.value - props.gap * (columns.value - 1)) / columns.value)
const rowHeight = computed(() => Math.ceil(props.itemHeight(columnWidth.value)) + props.gap)
const rowCount = computed(() => Math.ceil(props.items.length / columns.value))

const virtualizer = useWindowVirtualizer(computed(() => ({
  count: rowCount.value,
  estimateSize: () => rowHeight.value,
  overscan: 4,
  scrollMargin: scrollMargin.value
})))

watch(rowHeight, () => virtualizer.value.measure())

// Rows depend on the window size, which the server doesn't know: render them only in the
// browser so server and client markup agree during hydration.
const mounted = ref(false)
const virtualRows = computed(() => (mounted.value ? virtualizer.value.getVirtualItems() : []))
const totalHeight = computed(() => virtualizer.value.getTotalSize())

function rowItems(rowIndex: number): T[] {
  const start = rowIndex * columns.value
  return props.items.slice(start, start + columns.value)
}

function updateMeasurements() {
  const el = containerRef.value
  if (!el) return
  containerWidth.value = el.clientWidth
  scrollMargin.value = el.getBoundingClientRect().top + window.scrollY
}

/** Scrolls the window so the item at `index` is in view. */
function scrollToItem(index: number, align: 'auto' | 'center' | 'start' | 'end' = 'auto') {
  if (index < 0 || index >= props.items.length) return
  virtualizer.value.scrollToIndex(Math.floor(index / columns.value), { align })
}

defineExpose({ scrollToItem })

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  mounted.value = true
  updateMeasurements()
  resizeObserver = new ResizeObserver(updateMeasurements)
  if (containerRef.value) resizeObserver.observe(containerRef.value)
  // Content above the grid (player, filters) can change height too.
  resizeObserver.observe(document.body)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div ref="containerRef" class="relative w-full" :style="{ height: `${totalHeight}px` }">
    <div
      v-for="row in virtualRows"
      :key="row.index"
      class="absolute inset-x-0 top-0 grid"
      :style="{
        transform: `translateY(${row.start - scrollMargin}px)`,
        height: `${rowHeight - gap}px`,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        columnGap: `${gap}px`
      }"
    >
      <template v-for="item in rowItems(row.index)" :key="itemKey(item)">
        <slot :item="item" />
      </template>
    </div>
  </div>
</template>
