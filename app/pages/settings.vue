<script setup lang="ts">
useSeoMeta({ title: 'Settings - IPTV' })
</script>

<template>
  <div class="flex w-full max-w-3xl flex-1 flex-col gap-8">
    <PageTitle title="Settings" />
    <SettingsAppearance />
    <SettingsInstallApp />
    <EpgSettings />
  </div>
</template>
