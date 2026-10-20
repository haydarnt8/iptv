<script setup lang="ts">
const props = defineProps<{ src: string | null }>()

// Provider logos are often dead links; fall back to an icon instead of a broken image.
const failed = ref(false)
watch(() => props.src, () => {
  failed.value = false
})
</script>

<template>
  <span class="flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-elevated" aria-hidden="true">
    <img
      v-if="src && !failed"
      :src="src"
      alt=""
      class="size-full object-contain p-1"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    >
    <UIcon v-else name="i-lucide-tv" class="size-1/2 text-dimmed" />
  </span>
</template>
