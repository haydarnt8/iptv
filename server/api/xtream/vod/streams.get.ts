export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const categoryId = typeof query.categoryId === 'string' ? query.categoryId : undefined
  return await fetchVodStreams(categoryId)
})
