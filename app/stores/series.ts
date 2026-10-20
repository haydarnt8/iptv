import { defineStore } from 'pinia'
import type { SeriesSummary } from '#shared/types/xtream'

export const useSeriesStore = defineStore('series', () => {
  const xtream = useXtreamApi()
  return createCatalogState<SeriesSummary>({
    fetchCategories: () => xtream.getSeriesCategories(),
    fetchItems: categoryId => xtream.getSeriesList(categoryId),
    getName: show => show.name
  })
})
