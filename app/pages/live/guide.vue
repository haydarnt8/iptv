<script setup lang="ts">
import type { EpgProgramme, EpgStatus } from '#shared/types/epg'
import type { LiveStream } from '#shared/types/xtream'
import { FAVORITES_CATEGORY_ID } from '~/stores/liveTv'

useSeoMeta({ title: 'TV Guide - IPTV' })

const store = useLiveTvStore()
const {
  categories,
  categoriesEmpty,
  categoriesLoading,
  categoriesLoaded,
  categoriesError,
  selectedCategoryId,
  selectedCategory,
  items,
  filteredItems,
  itemsLoading,
  itemsError,
  searchQuery,
  selectedChannel
} = storeToRefs(store)

const epgApi = useEpgApi()
const clock = useClock(30_000)
const gridRef = useTemplateRef<{ scrollToNow: () => void, scrollToTop: () => void }>('grid')

const categoryIcons = { [FAVORITES_CATEGORY_ID]: 'i-lucide-star' }
const guideStatus = ref<EpgStatus | null>(null)
const guideIsEmpty = computed(() => guideStatus.value?.state !== 'building' && guideStatus.value?.matchedChannels === 0)

onMounted(async () => {
  store.init()
  try {
    guideStatus.value = await epgApi.getStatus()
  } catch {
    // The grid still works; it just shows "No guide information" rows.
  }
})

watch(selectedCategoryId, () => gridRef.value?.scrollToTop())

function watchChannel(channel: LiveStream) {
  store.playChannel(channel, filteredItems.value)
  navigateTo('/live')
}

// --- Programme details ---

const detail = shallowRef<{ programme: EpgProgramme, channel: LiveStream } | null>(null)
const detailOpen = computed({
  get: () => detail.value !== null,
  set: (open: boolean) => {
    if (!open) detail.value = null
  }
})
const detailIsLive = computed(() =>
  !!detail.value && detail.value.programme.start <= clock.value && clock.value < detail.value.programme.stop
)

function openProgramme(programme: EpgProgramme, channel: LiveStream) {
  detail.value = { programme, channel }
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-3">
    <h1 class="sr-only">
      TV Guide
    </h1>

    <USkeleton v-if="categoriesLoading" class="h-9 w-full sm:w-72" />

    <div v-else-if="categoriesError" class="flex flex-col items-start gap-2">
      <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="categoriesError" />
      <UButton size="sm" variant="soft" @click="store.retry()">
        Retry
      </UButton>
    </div>

    <EmptyState
      v-else-if="categoriesEmpty"
      icon="i-lucide-tv"
      title="No live channels"
      description="Your IPTV service didn't return any Live TV categories."
    />

    <template v-else-if="categoriesLoaded">
      <div class="flex flex-wrap items-center gap-2">
        <CategorySelect
          :categories="categories"
          :model-value="selectedCategoryId"
          :icons="categoryIcons"
          class="min-w-0 flex-1 sm:flex-none"
          @update:model-value="store.selectCategory"
        />
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="`Search ${selectedCategory?.categoryName ?? 'this category'}`"
          :aria-label="`Search ${selectedCategory?.categoryName ?? 'this category'}`"
          :disabled="itemsLoading || !!itemsError || items.length === 0"
          class="hidden w-64 sm:block"
        />
        <UButton icon="i-lucide-locate-fixed" variant="soft" color="neutral" @click="gridRef?.scrollToNow()">
          Now
        </UButton>
        <UButton to="/live" icon="i-lucide-list" variant="ghost" color="neutral" class="hidden sm:inline-flex">
          Channel list
        </UButton>
      </div>

      <UAlert
        v-if="guideIsEmpty"
        color="neutral"
        variant="subtle"
        icon="i-lucide-calendar-x"
        title="No programme data yet"
        description="Your provider doesn't publish a TV guide. Add an XMLTV guide source to fill it in."
        :actions="[{ label: 'Set up guide', to: '/settings', color: 'primary', variant: 'solid' }]"
      />

      <div v-if="itemsLoading" class="flex flex-col gap-1">
        <USkeleton v-for="i in 8" :key="i" class="h-14 w-full" />
      </div>

      <div v-else-if="itemsError" class="flex flex-col items-start gap-2">
        <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="itemsError" />
        <UButton size="sm" variant="soft" @click="store.retry()">
          Retry
        </UButton>
      </div>

      <EmptyState
        v-else-if="filteredItems.length === 0"
        :icon="selectedCategoryId === FAVORITES_CATEGORY_ID ? 'i-lucide-star' : 'i-lucide-tv'"
        :title="selectedCategoryId === FAVORITES_CATEGORY_ID ? 'No favorite channels yet' : 'No channels here'"
        :description="selectedCategoryId === FAVORITES_CATEGORY_ID
          ? 'Star channels in the channel list to see their guide here.'
          : 'Pick another category or clear the search.'"
      />

      <ClientOnly v-else>
        <EpgGuideGrid
          ref="grid"
          :channels="filteredItems"
          :playing-id="selectedChannel?.streamId ?? null"
          class="h-[calc(100dvh-13rem)] md:h-[calc(100dvh-9.5rem)]"
          @play="watchChannel"
          @open="openProgramme"
        />
        <template #fallback>
          <USkeleton class="h-[calc(100dvh-13rem)] w-full md:h-[calc(100dvh-9.5rem)]" />
        </template>
      </ClientOnly>
    </template>

    <UModal v-model:open="detailOpen" :title="detail?.programme.title ?? ''">
      <template #description>
        <span v-if="detail">
          {{ detail.channel.name }} · {{ formatDay(detail.programme.start, clock) }},
          {{ formatClock(detail.programme.start) }} – {{ formatClock(detail.programme.stop) }}
        </span>
      </template>
      <template #body>
        <div v-if="detail" class="flex flex-col gap-3">
          <UProgress
            v-if="detailIsLive"
            :model-value="programmeProgress(detail.programme.start, detail.programme.stop, clock)"
            size="xs"
            aria-label="Progress through this programme"
          />
          <p class="text-sm" :class="detail.programme.description ? '' : 'text-muted'">
            {{ detail.programme.description ?? 'No description available.' }}
          </p>
        </div>
      </template>
      <template #footer>
        <div v-if="detail" class="flex w-full justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="detail = null">
            Close
          </UButton>
          <UButton icon="i-lucide-play" @click="watchChannel(detail.channel)">
            {{ detailIsLive ? 'Watch now' : `Watch ${detail.channel.name}` }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
