<script setup lang="ts">
const { canPrompt, installed, install } = usePwaInstall()
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">
        App
      </h2>
    </template>

    <div class="flex items-start gap-3">
      <img src="/icons/icon.svg" alt="" class="size-12 shrink-0 rounded-xl">
      <div class="flex min-w-0 flex-1 flex-col items-start gap-2">
        <!-- The install state is only known in the browser. -->
        <ClientOnly>
          <template v-if="installed">
            <p class="text-sm">
              You're using the installed app.
            </p>
          </template>
          <template v-else>
            <p class="text-sm">
              Install IPTV to open it in its own window, from your Dock or Start menu, like a regular app.
            </p>
            <UButton v-if="canPrompt" icon="i-lucide-download" size="sm" @click="install">
              Install app
            </UButton>
            <p v-else class="text-xs text-muted">
              Chrome or Edge: use the install icon at the right of the address bar.
              Safari on Mac: File → Add to Dock.
            </p>
          </template>
          <template #fallback>
            <USkeleton class="h-10 w-full" />
          </template>
        </ClientOnly>
        <p class="text-xs text-muted">
          It installs on this computer only: the app is private to the computer running it, so phones and other
          devices can't open it.
        </p>
      </div>
    </div>
  </UCard>
</template>
