<script setup lang="ts">
const props = defineProps<{
  to: string
  title: string
  image: string | null
  rating?: number | null
  /** Shown when there's no artwork. */
  icon: string
}>()

const failed = ref(false)
const loaded = ref(false)
const imageRef = ref<HTMLImageElement | null>(null)

watch(() => props.image, () => {
  failed.value = false
  loaded.value = false
})

// An image that finished before hydration never fires `load` for us.
onMounted(() => {
  if (imageRef.value?.complete && imageRef.value.naturalWidth > 0) loaded.value = true
})
</script>

<template>
  <NuxtLink :to="to" class="group flex min-w-0 flex-col gap-2 outline-none">
    <span
      class="relative flex aspect-2/3 items-center justify-center overflow-hidden rounded-lg bg-elevated shadow-card ring-[0.5px] ring-default transition duration-300 ease-spring group-hover:-translate-y-1 group-hover:shadow-xl group-focus-visible:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-primary group-active:scale-[0.98]"
    >
      <img
        v-if="image && !failed"
        ref="imageRef"
        :src="image"
        alt=""
        class="size-full object-cover transition-opacity duration-500"
        :class="loaded ? 'opacity-100' : 'opacity-0'"
        loading="lazy"
        decoding="async"
        @load="loaded = true"
        @error="failed = true"
      >
      <UIcon v-if="!image || failed" :name="icon" class="size-8 text-dimmed" />
    </span>
    <span class="flex flex-col px-0.5">
      <span class="line-clamp-2 text-[13px] leading-[1.3] font-medium text-highlighted">{{ title }}</span>
      <span v-if="rating" class="mt-0.5 flex items-center gap-1 text-xs text-muted">
        <UIcon name="i-lucide-star" class="size-3" />
        {{ rating.toFixed(1) }}
      </span>
    </span>
  </NuxtLink>
</template>
