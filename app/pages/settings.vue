<script setup lang="ts">
useSeoMeta({ title: 'Settings - IPTV' })
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <h1 class="text-lg font-semibold">
      Settings
    </h1>
    <SettingsAppearance />
    <SettingsInstallApp />
    <EpgSettings />
  </div>
</template>
