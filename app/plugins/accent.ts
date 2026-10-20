// Applies the saved accent colour on both server and client so first paint is already correct.
export default defineNuxtPlugin(() => {
  useAccentColor().apply()
})
