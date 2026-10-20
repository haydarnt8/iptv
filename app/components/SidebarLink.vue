<script setup lang="ts">
import type { AppNavItem } from '~/utils/nav'

defineProps<{ item: AppNavItem, active: boolean }>()
</script>

<template>
  <NuxtLink
    :to="item.to"
    class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
    :class="active ? 'bg-accented/80 text-highlighted' : 'text-toned hover:bg-accented/40 hover:text-highlighted'"
    :aria-current="active ? 'page' : undefined"
  >
    <UIcon :name="item.icon" class="size-[18px] shrink-0" :class="active ? 'text-accent' : 'text-muted'" />
    <span class="truncate">{{ item.label }}</span>
  </NuxtLink>
</template>
