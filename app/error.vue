<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isNotFound = computed(() => props.error.statusCode === 404)

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <UApp>
    <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <UIcon name="i-lucide-satellite-dish" class="size-12 text-muted" />
      <h1 class="text-2xl font-semibold">
        {{ isNotFound ? 'Page not found' : 'Something went wrong' }}
      </h1>
      <p class="max-w-sm text-sm text-muted">
        {{
          isNotFound
            ? "The page you're looking for doesn't exist."
            : 'An unexpected error occurred. Check the server logs for details.'
        }}
      </p>
      <UButton @click="goHome">
        Go back home
      </UButton>
    </div>
  </UApp>
</template>
