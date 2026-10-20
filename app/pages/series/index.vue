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

const countLabel = computed(() =>
  !itemsLoading.value && !itemsError.value && items.value.length
    ? `${filteredItems.value.length.toLocaleString()} series`
    : undefined
)

// Artwork (2:3) plus two title lines and a rating line, so every row has the same height.
const cellHeight = (columnWidth: number) => columnWidth * 1.5 + 60
const itemKey = (item: SeriesSummary) => item.seriesId
</script>

<template>
  <div class="flex flex-1 flex-col gap-5">
    <PageTitle title="Series" :subtitle="countLabel" />

    <USkeleton v-if="categoriesLoading" class="h-9 w-full rounded-xl sm:w-72" />

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
          :aria-label="`Search ${selectedCategory?.categoryName ?? 'this category'}`"
          :disabled="itemsLoading || !!itemsError"
          class="w-full sm:max-w-sm"
        />
      </div>

      <div v-if="itemsLoading" class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        <div v-for="i in 12" :key="i" class="flex flex-col gap-2">
          <USkeleton class="aspect-2/3 w-full rounded-lg" />
          <USkeleton class="h-3 w-3/4" />
        </div>
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
        title="No Results"
        :description="`Nothing in ${selectedCategory?.categoryName ?? 'this category'} matches \u201C${searchQuery}\u201D.`"
      />

      <VirtualGrid
        v-else
        :items="filteredItems"
        :item-key="itemKey"
        :min-column-width="150"
        :item-height="cellHeight"
        :gap="18"
      >
        <template #default="{ item }">
          <MediaPosterCard
            :to="`/series/${item.seriesId}`"
            :title="item.name"
            :image="item.cover"
            :rating="item.rating"
            icon="i-lucide-clapperboard"
          />
        </template>
      </VirtualGrid>
    </template>
  </div>
</template>
