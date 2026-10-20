<script setup lang="ts">
import { findNavItem, moreItems } from '~/utils/nav'

const route = useRoute()
const moreOpen = ref(false)
const largeTitleVisible = useLargeTitleVisible()

const pageTitle = computed(() => findNavItem(route.path)?.label ?? 'IPTV')

watch(() => route.path, () => {
  moreOpen.value = false
})

// Build the search index in the background shortly after the app opens.
onMounted(() => {
  setTimeout(() => {
    useXtreamApi().warmSearch().catch(() => {})
  }, 3000)
})
</script>

<template>
  <div class="flex min-h-screen">
    <aside
      class="hidden md:sticky md:top-0 md:z-30 md:block md:h-dvh md:w-64 md:shrink-0 md:pt-(--toolbar-top) md:pr-2 md:pb-[max(0.5rem,var(--safe-bottom))] md:pl-[max(0.5rem,var(--safe-left))]"
    >
      <AppSidebar />
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- A floating glass toolbar, matching the sidebar (desktop) and the tab bar (phones). -->
      <header
        class="glass-panel sticky top-(--toolbar-top) z-30 mt-(--toolbar-top) mr-[max(0.75rem,var(--safe-right))] ml-[max(0.75rem,var(--safe-left))] flex h-14 items-center justify-between gap-2 rounded-full px-2 md:mr-[max(0.5rem,var(--safe-right))] md:ml-0 md:rounded-2xl md:px-4"
      >
        <div class="flex min-w-0 items-center gap-2">
          <UButton
            class="md:hidden"
            icon="i-lucide-menu"
            variant="ghost"
            color="neutral"
            aria-label="Open menu"
            @click="moreOpen = true"
          />
          <Transition
            enter-from-class="opacity-0 translate-y-1"
            leave-to-class="opacity-0 translate-y-1"
            enter-active-class="transition duration-200"
            leave-active-class="transition duration-150"
          >
            <span v-if="!largeTitleVisible" class="truncate pl-2 text-[15px] font-semibold text-highlighted md:pl-0">
              {{ pageTitle }}
            </span>
          </Transition>
        </div>
        <div class="flex items-center gap-2">
          <CastIndicator />
          <UColorModeButton />
        </div>
      </header>

      <!-- The window scrolls, not <main>: an overflow-y here would break `position: sticky` in pages. -->
      <main
        class="flex flex-1 flex-col overflow-x-clip pt-4 pr-[max(1rem,var(--safe-right))] pb-[calc(7rem+var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] md:pr-[max(1.5rem,var(--safe-right))] md:pb-[calc(2rem+var(--safe-bottom))] md:pl-6 lg:pr-[max(2rem,var(--safe-right))] lg:pl-8"
      >
        <slot />
      </main>
    </div>

    <!-- iOS-style scroll-edge fades: content scrolling past the status bar / home indicator
         dissolves instead of showing through around the floating bars. They sit beneath the
         sidebar and toolbar (z-30) so those keep their full shadows. -->
    <div
      class="pointer-events-none fixed inset-x-0 top-0 z-20 h-[calc(var(--toolbar-bottom)+0.75rem)] bg-gradient-to-b from-default from-40% via-default/60 to-transparent"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[calc(var(--safe-bottom)+6rem)] bg-gradient-to-t from-default via-default/70 to-transparent md:hidden"
      aria-hidden="true"
    />

    <AppTabBar />

    <USlideover
      v-model:open="moreOpen"
      title="More"
      side="left"
      :ui="{ content: 'pt-(--safe-top) pb-(--safe-bottom) pl-(--safe-left)' }"
    >
      <template #body>
        <nav aria-label="More" class="flex flex-col gap-0.5">
          <SidebarLink
            v-for="item in moreItems"
            :key="item.to"
            :item="item"
            :active="findNavItem(route.path)?.to === item.to"
          />
        </nav>
      </template>
    </USlideover>
  </div>
</template>
