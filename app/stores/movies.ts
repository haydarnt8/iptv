import { defineStore } from 'pinia'
import type { VodStream } from '#shared/types/xtream'

export const useMoviesStore = defineStore('movies', () => {
  const xtream = useXtreamApi()
  return createCatalogState<VodStream>({
    fetchCategories: () => xtream.getVodCategories(),
    fetchItems: categoryId => xtream.getVodStreams(categoryId),
    getName: movie => movie.name
  })
})
