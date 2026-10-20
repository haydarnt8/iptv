<script setup lang="ts">
// Rounding and background come from the caller (tiles, rows and heroes differ).
const props = defineProps<{ src: string | null }>()

// Provider logos are often dead links; fall back to an icon instead of a broken image.
const failed = ref(false)
// Fades in once decoded instead of popping in line by line.
const loaded = ref(false)
const imageRef = ref<HTMLImageElement | null>(null)

watch(() => props.src, () => {
  failed.value = false
  loaded.value = false
})

// An image that finished before hydration never fires `load` for us.
onMounted(() => {
  if (imageRef.value?.complete && imageRef.value.naturalWidth > 0) loaded.value = true
})
</script>

<template>
  <span class="flex shrink-0 items-center justify-center overflow-hidden" aria-hidden="true">
    <img
      v-if="src && !failed"
      ref="imageRef"
      :src="src"
      alt=""
      class="size-full object-contain p-[12%] transition-opacity duration-300"
      :class="loaded ? 'opacity-100' : 'opacity-0'"
      loading="lazy"
      decoding="async"
      @load="loaded = true"
      @error="failed = true"
    >
    <UIcon v-else name="i-lucide-tv" class="size-1/2 text-dimmed" />
  </span>
</template>
