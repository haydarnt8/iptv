<script setup lang="ts">
const { canPrompt, installed, install } = usePwaInstall()
</script>

<template>
  <GroupedSection
    title="App"
    footer="It installs on this computer only: the app is private to the computer running it, so phones and other devices can't open it."
  >
    <div class="flex items-center gap-3 px-4 py-3">
      <img src="/icons/icon.svg" alt="" class="size-11 shrink-0 rounded-[10px] shadow-sm">
      <div class="min-w-0 flex-1">
        <p class="text-[15px] text-highlighted">
          IPTV for this computer
        </p>
        <!-- The install state is only known in the browser. -->
        <ClientOnly>
          <p class="text-[13px] text-muted">
            <template v-if="installed">
              You're using the installed app.
            </template>
            <template v-else-if="canPrompt">
              Open it in its own window, from your Dock or Start menu.
            </template>
            <template v-else>
              Chrome or Edge: the install icon in the address bar. Safari on Mac: File → Add to Dock.
            </template>
          </p>
        </ClientOnly>
      </div>
      <ClientOnly>
        <UButton v-if="!installed && canPrompt" icon="i-lucide-download" size="sm" @click="install">
          Install
        </UButton>
      </ClientOnly>
    </div>
  </GroupedSection>
</template>
