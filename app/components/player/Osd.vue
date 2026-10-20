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
      class="glass-video absolute inset-x-3 top-3 z-10 flex items-center gap-3 rounded-2xl py-2 pr-2 pl-2.5 text-white"
    >
      <img
        v-if="image && !imageFailed"
        :src="image"
        alt=""
        class="size-10 shrink-0 rounded-lg bg-white/10 object-contain p-1"
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
