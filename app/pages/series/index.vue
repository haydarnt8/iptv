<script setup lang="ts">
import type { SeriesSummary } from '#shared/types/xtream'

useSeoMeta({ title: 'Series - IPTV' })

const store = useSeriesStore()
const {
  categories,
  categoriesLoading,
  categoriesLoaded,
  categoriesError,
  selectedCategoryId,
  selectedCategory,
  items,
  filteredItems,
  itemsLoading,
  itemsError,
  searchQuery
} = storeToRefs(store)

onMounted(() => {
  store.init()
})

// Cover (2:3) plus a fixed two-line title, so every row has the same height.
const cellHeight = (columnWidth: number) => columnWidth * 1.5 + 46
const showKey = (show: SeriesSummary) => show.seriesId

function hideIcon(event: Event) {
  (event.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <h1 class="text-lg font-semibold">
      Series
    </h1>

    <USkeleton v-if="categoriesLoading" class="h-9 w-full sm:w-72" />

    <div v-else-if="categoriesError" class="flex flex-col items-start gap-2">
      <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="categoriesError" />
      <UButton size="sm" variant="soft" @click="store.retry()">
        Retry
      </UButton>
    </div>

    <EmptyState
      v-else-if="categoriesLoaded && categories.length === 0"
      icon="i-lucide-clapperboard"
      title="No series"
      description="Your IPTV service didn't return any series categories."
    />

    <template v-else-if="categoriesLoaded">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <CategorySelect
          :categories="categories"
          :model-value="selectedCategoryId"
          @update:model-value="store.selectCategory"
        />
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="`Search ${selectedCategory?.categoryName ?? 'this category'}`"
          :disabled="itemsLoading || !!itemsError"
          class="w-full sm:max-w-sm"
        />
      </div>

      <div v-if="itemsLoading" class="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        <USkeleton v-for="i in 12" :key="i" class="aspect-2/3 w-full" />
      </div>

      <div v-else-if="itemsError" class="flex flex-col items-start gap-2">
        <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="itemsError" />
        <UButton size="sm" variant="soft" @click="store.retry()">
          Retry
        </UButton>
      </div>

      <EmptyState
        v-else-if="items.length === 0"
        icon="i-lucide-clapperboard"
        title="This category is empty"
        description="Pick another category."
      />

      <EmptyState
        v-else-if="filteredItems.length === 0"
        icon="i-lucide-search-x"
        title="No matching series"
        description="Try a different search term or category."
      />

      <template v-else>
        <p class="text-sm text-muted">
          {{ filteredItems.length.toLocaleString() }} series
        </p>
        <VirtualGrid
          :items="filteredItems"
          :item-key="showKey"
          :min-column-width="140"
          :item-height="cellHeight"
        >
          <template #default="{ item: show }">
            <NuxtLink :to="`/series/${show.seriesId}`" class="group flex flex-col gap-1.5">
              <div class="flex aspect-2/3 items-center justify-center overflow-hidden rounded-lg bg-elevated">
                <img
                  v-if="show.cover"
                  :src="show.cover"
                  alt=""
                  class="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                  @error="hideIcon"
                >
                <UIcon v-else name="i-lucide-clapperboard" class="size-8 text-muted" />
              </div>
              <span class="line-clamp-2 h-10 text-sm leading-5">{{ show.name }}</span>
            </NuxtLink>
          </template>
        </VirtualGrid>
      </template>
    </template>
  </div>
</template>
