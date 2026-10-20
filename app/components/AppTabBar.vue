<script setup lang="ts">
import { findNavItem, tabBarItems } from '~/utils/nav'

const route = useRoute()
const activePath = computed(() => findNavItem(route.path)?.to)
</script>

<template>
  <!-- iOS-style floating tab bar: a glass capsule above the home indicator. -->
  <nav
    aria-label="Primary"
    class="glass-panel fixed right-[max(0.75rem,var(--safe-right))] bottom-[max(0.75rem,var(--safe-bottom))] left-[max(0.75rem,var(--safe-left))] z-40 flex h-16 items-center justify-around rounded-full px-1.5 md:hidden"
  >
    <NuxtLink
      v-for="item in tabBarItems"
      :key="item.to"
      :to="item.to"
      class="flex h-13 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
      :class="activePath === item.to ? 'bg-accented/70 text-accent' : 'text-muted'"
      :aria-current="activePath === item.to ? 'page' : undefined"
    >
      <UIcon :name="item.icon" class="size-[22px]" />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
