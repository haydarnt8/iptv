import type { XtreamCategory } from '#shared/types/xtream'

/** A category whose items live on the client (e.g. Favorites) rather than on the provider. */
export interface LocalCategory<TItem> {
  categoryId: string
  categoryName: string
  items: () => TItem[]
}

interface CatalogOptions<TItem> {
  fetchCategories: () => Promise<XtreamCategory[]>
  fetchItems: (categoryId: string) => Promise<TItem[]>
  getName: (item: TItem) => string
  /** Listed before the provider's categories. */
  localCategories?: LocalCategory<TItem>[]
}

// A real provider catalog measured at 63,626 movies (15 MB) when fetched all at
// once, and 1.6 GB of JS heap once rendered. Loading one category at a time
// and keeping only a handful of them around bounds both.
const MAX_CACHED_CATEGORIES = 6

/**
 * Per-category catalog state shared by the Live TV, Movies and Series stores.
 * Call it inside a Pinia setup store. Item arrays live in a shallowRef: they
 * can hold thousands of entries and are replaced, never mutated, so deep
 * reactivity would only add proxy overhead.
 */
export function createCatalogState<TItem>(options: CatalogOptions<TItem>) {
  const localCategories = options.localCategories ?? []
  const remoteCategories = ref<XtreamCategory[]>([])
  const categories = computed<XtreamCategory[]>(() => [
    ...localCategories.map(({ categoryId, categoryName }) => ({ categoryId, categoryName, parentId: null })),
    ...remoteCategories.value
  ])
  const categoriesLoading = ref(false)
  const categoriesLoaded = ref(false)
  const categoriesError = ref<string | null>(null)
  /** True once loaded if the provider has no categories at all (local ones don't count). */
  const categoriesEmpty = computed(() => categoriesLoaded.value && remoteCategories.value.length === 0)

  const selectedCategoryId = ref<string | null>(null)
  const itemsByCategory = shallowRef(new Map<string, TItem[]>())
  const itemsLoading = ref(false)
  const itemsError = ref<string | null>(null)
  const searchQuery = ref('')

  // Guards against a slow response for a category the user has already left.
  let latestRequest = 0

  const selectedCategory = computed(() =>
    categories.value.find(category => category.categoryId === selectedCategoryId.value) ?? null
  )

  function findLocal(categoryId: string | null) {
    return localCategories.find(category => category.categoryId === categoryId) ?? null
  }

  const items = computed<TItem[]>(() => {
    const id = selectedCategoryId.value
    if (!id) return []
    return findLocal(id)?.items() ?? itemsByCategory.value.get(id) ?? []
  })

  const filteredItems = computed<TItem[]>(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return items.value
    return items.value.filter(item => options.getName(item).toLowerCase().includes(query))
  })

  function cacheItems(categoryId: string, list: TItem[]) {
    const next = new Map(itemsByCategory.value)
    next.delete(categoryId)
    next.set(categoryId, list)
    while (next.size > MAX_CACHED_CATEGORIES) {
      const oldest = next.keys().next().value
      if (oldest === undefined || oldest === selectedCategoryId.value) break
      next.delete(oldest)
    }
    itemsByCategory.value = next
  }

  async function loadItems(categoryId: string) {
    const request = ++latestRequest
    itemsLoading.value = true
    itemsError.value = null

    try {
      const list = await options.fetchItems(categoryId)
      if (request === latestRequest) cacheItems(categoryId, list)
    } catch (err) {
      if (request === latestRequest) itemsError.value = getErrorMessage(err)
    } finally {
      if (request === latestRequest) itemsLoading.value = false
    }
  }

  async function selectCategory(categoryId: string) {
    const isLocal = findLocal(categoryId) !== null
    if (categoryId === selectedCategoryId.value && (isLocal || itemsByCategory.value.has(categoryId))) return
    selectedCategoryId.value = categoryId
    searchQuery.value = ''

    if (isLocal || itemsByCategory.value.has(categoryId)) {
      latestRequest++
      itemsLoading.value = false
      itemsError.value = null
      return
    }
    await loadItems(categoryId)
  }

  async function loadCategories() {
    categoriesLoading.value = true
    categoriesError.value = null
    try {
      remoteCategories.value = await options.fetchCategories()
      categoriesLoaded.value = true
    } catch (err) {
      categoriesError.value = getErrorMessage(err)
    } finally {
      categoriesLoading.value = false
    }
  }

  /**
   * Idempotent entry point for pages: categories, then the current category, else `preferred`
   * (if it still exists), else the provider's first category.
   */
  async function init(preferred?: string | null) {
    if (!categoriesLoaded.value && !categoriesLoading.value) {
      await loadCategories()
    }
    const exists = (id: string | null | undefined): id is string =>
      !!id && categories.value.some(category => category.categoryId === id)
    const target = [selectedCategoryId.value, preferred, remoteCategories.value[0]?.categoryId].find(exists)
    if (target) await selectCategory(target)
  }

  async function retry() {
    if (!categoriesLoaded.value) {
      await init()
    } else if (selectedCategoryId.value && !findLocal(selectedCategoryId.value)) {
      await loadItems(selectedCategoryId.value)
    }
  }

  return {
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
    init,
    selectCategory,
    retry
  }
}
