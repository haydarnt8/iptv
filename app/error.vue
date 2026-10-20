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
    <div class="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <img src="/icons/icon.svg" alt="" class="mb-4 size-16 rounded-2xl shadow-card">
      <h1 class="text-2xl font-bold tracking-tight text-highlighted">
        {{ isNotFound ? 'Page Not Found' : 'Something Went Wrong' }}
      </h1>
      <p class="max-w-sm text-[15px] text-muted">
        {{
          isNotFound
            ? "The page you're looking for doesn't exist."
            : 'An unexpected error occurred. Check the server logs for details.'
        }}
      </p>
      <UButton size="lg" class="mt-4 px-6" @click="goHome">
        Go Home
      </UButton>
    </div>
  </UApp>
</template>
