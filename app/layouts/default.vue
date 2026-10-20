<script setup lang="ts">
import { primaryNavItems, secondaryNavItems } from '~/utils/nav'

const route = useRoute()
const moreOpen = ref(false)

const pageTitle = computed(() => {
  const match = [...primaryNavItems, ...secondaryNavItems].find(
    item => item.to === route.path
  )
  return match?.label ?? 'IPTV'
})

watch(
  () => route.path,
  () => {
    moreOpen.value = false
  }
)
</script>

<template>
  <div class="flex min-h-screen">
    <aside
      class="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-default md:px-3 md:py-4"
    >
      <div class="mb-4 px-2 text-lg font-semibold">IPTV</div>
      <UNavigationMenu
        orientation="vertical"
        :items="[primaryNavItems, secondaryNavItems]"
        class="flex-1"
      />
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-default bg-default px-4"
      >
        <div class="flex items-center gap-2">
          <UButton
            class="md:hidden"
            icon="i-lucide-menu"
            variant="ghost"
            color="neutral"
            aria-label="Open menu"
            @click="moreOpen = true"
          />
          <span class="font-medium">{{ pageTitle }}</span>
        </div>
        <div class="flex items-center gap-2">
          <CastIndicator />
          <UColorModeButton />
        </div>
      </header>

      <!-- The window scrolls, not <main>: an overflow-y here would break `position: sticky` in pages. -->
      <main class="flex flex-1 flex-col overflow-x-clip p-4 pb-20 md:pb-4">
        <slot />
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-default bg-default md:hidden"
      aria-label="Primary"
    >
      <NuxtLink
        v-for="item in primaryNavItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center gap-0.5 text-xs"
        :class="route.path === item.to ? 'text-primary' : 'text-muted'"
      >
        <UIcon :name="item.icon" class="size-5" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <USlideover v-model:open="moreOpen" title="Menu">
      <template #body>
        <UNavigationMenu orientation="vertical" :items="secondaryNavItems" />
      </template>
    </USlideover>
  </div>
</template>
