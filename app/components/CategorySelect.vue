<script setup lang="ts">
import type { XtreamCategory } from '#shared/types/xtream'

const props = withDefaults(defineProps<{
  categories: XtreamCategory[]
  modelValue: string | null
  /** Optional per-category icons, e.g. a star for Favorites. */
  icons?: Record<string, string>
}>(), { icons: () => ({}) })

const emit = defineEmits<{ 'update:modelValue': [categoryId: string] }>()

// Searchable rather than a row of chips: real providers have 35-144 categories.
const items = computed(() =>
  props.categories.map(category => ({
    label: category.categoryName,
    value: category.categoryId,
    icon: props.icons[category.categoryId]
  }))
)

const leadingIcon = computed(() => (props.modelValue && props.icons[props.modelValue]) || 'i-lucide-folder')

function onSelect(value: unknown) {
  if (typeof value === 'string') emit('update:modelValue', value)
}
</script>

<template>
  <USelectMenu
    :model-value="modelValue ?? undefined"
    :items="items"
    value-key="value"
    :search-input="{ placeholder: 'Find a category' }"
    placeholder="Choose a category"
    :icon="leadingIcon"
    aria-label="Category"
    class="w-full sm:w-72"
    @update:model-value="onSelect"
  />
</template>
