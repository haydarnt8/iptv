<script setup lang="ts">
import type { AppNavItem } from '~/utils/nav'
import { findNavItem, sidebarFooterItems, sidebarSections } from '~/utils/nav'

const route = useRoute()
const activeItem = computed(() => findNavItem(route.path))

function isActive(item: AppNavItem) {
  return activeItem.value?.to === item.to
}
</script>

<template>
  <!-- A floating glass source list, like a macOS sidebar. -->
  <nav aria-label="Main" class="glass-panel flex h-full flex-col rounded-2xl p-3">
    <NuxtLink to="/" class="mb-4 rounded-lg px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <AppLogo />
    </NuxtLink>

    <div class="flex flex-1 flex-col gap-5 overflow-y-auto">
      <div v-for="(section, index) in sidebarSections" :key="index" class="flex flex-col gap-0.5">
        <p v-if="section.label" class="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-dimmed">
          {{ section.label }}
        </p>
        <SidebarLink v-for="item in section.items" :key="item.to" :item="item" :active="isActive(item)" />
      </div>
    </div>

    <div class="flex flex-col gap-0.5 border-t border-default/60 pt-3">
      <SidebarLink v-for="item in sidebarFooterItems" :key="item.to" :item="item" :active="isActive(item)" />
    </div>
  </nav>
</template>
