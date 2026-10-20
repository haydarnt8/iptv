<script setup lang="ts">
// On-screen display: what's playing, shown along the top of the video.
const props = defineProps<{
  visible: boolean
  title: string
  subtitle?: string
  image?: string | null
}>()

defineSlots<{ actions?: () => unknown }>()

// Channel logos are often dead links; hide a broken one until the next channel.
const imageFailed = ref(false)
watch(() => props.image, () => {
  imageFailed.value = false
})
</script>

<template>
  <Transition
    enter-from-class="opacity-0 -translate-y-2"
    leave-to-class="opacity-0 -translate-y-2"
    enter-active-class="transition duration-200"
    leave-active-class="transition duration-200"
  >
    <div
      v-if="visible"
      class="absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 pb-8 pt-3 text-white"
    >
      <img
        v-if="image && !imageFailed"
        :src="image"
        alt=""
        class="size-10 shrink-0 rounded bg-white/10 object-contain p-0.5"
        @error="imageFailed = true"
      >
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold drop-shadow">
          {{ title }}
        </p>
        <p v-if="subtitle" class="truncate text-sm text-white/80 drop-shadow">
          {{ subtitle }}
        </p>
      </div>
      <slot name="actions" />
    </div>
  </Transition>
</template>
