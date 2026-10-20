<script setup lang="ts">
// Covers the video while it plays on the TV, and offers "Watch here" once casting ends.
defineProps<{
  mode: 'casting' | 'ended'
  deviceName: string | null
  title?: string
  loading: boolean
  error: string | null
  /** 'IDLE' | 'PLAYING' | 'PAUSED' | 'BUFFERING' on the TV. */
  remoteState: string | null
}>()

defineEmits<{
  retry: []
  stop: []
  resumeHere: []
}>()
</script>

<template>
  <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black px-4 text-center text-white sm:gap-3">
    <template v-if="mode === 'casting'">
      <UIcon name="i-lucide-cast" class="size-8 text-primary sm:size-10" />
      <p class="text-xs text-white/70 sm:text-sm">
        Playing on <span class="font-medium text-white">{{ deviceName ?? 'your TV' }}</span>
      </p>
      <p v-if="title" class="max-w-md truncate text-sm font-semibold sm:text-base">
        {{ title }}
      </p>
      <p v-if="error" class="max-w-md text-xs text-error sm:text-sm" role="alert">
        {{ error }}
      </p>
      <p v-else-if="loading || remoteState === 'BUFFERING'" class="flex items-center gap-1.5 text-xs text-white/70" role="status">
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
        {{ loading ? 'Sending to TV…' : 'Buffering on TV…' }}
      </p>
      <div class="flex gap-2">
        <UButton v-if="error" size="sm" variant="soft" icon="i-lucide-rotate-cw" @click="$emit('retry')">
          Try again
        </UButton>
        <UButton size="sm" variant="soft" color="neutral" icon="i-lucide-square" @click="$emit('stop')">
          Stop casting
        </UButton>
      </div>
    </template>

    <template v-else>
      <UIcon name="i-lucide-cast" class="size-8 text-white/50" />
      <p class="text-sm text-white/80">
        Casting ended
      </p>
      <UButton size="sm" icon="i-lucide-play" @click="$emit('resumeHere')">
        Watch here
      </UButton>
    </template>
  </div>
</template>
