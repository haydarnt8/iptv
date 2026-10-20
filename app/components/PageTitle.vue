<script setup lang="ts">
// An iOS-style large title. While it's on screen the toolbar hides its small title;
// once it scrolls away, the toolbar's title fades in.
defineProps<{
  title: string
  subtitle?: string
}>()

defineSlots<{ actions?: () => unknown }>()

const largeTitleVisible = useLargeTitleVisible()
const titleRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!titleRef.value) return
  // The title counts as hidden once it slides under the floating toolbar (whose position
  // depends on the safe area, so it's measured rather than assumed).
  const toolbarBottom = Math.round(document.querySelector('header')?.getBoundingClientRect().bottom ?? 64)
  observer = new IntersectionObserver(([entry]) => {
    largeTitleVisible.value = entry?.isIntersecting ?? false
  }, { rootMargin: `-${toolbarBottom}px 0px 0px 0px` })
  observer.observe(titleRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  largeTitleVisible.value = false
})
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-1">
    <div ref="titleRef" class="min-w-0">
      <h1 class="text-[2rem] leading-tight font-bold tracking-tight text-highlighted">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-0.5 text-[15px] text-muted">
        {{ subtitle }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
