// Applies the saved accent colour on both server and client so first paint is already correct,
// and marks it on <html> for accent-specific styling (e.g. dark text on yellow).
export default defineNuxtPlugin(() => {
  useAccentColor().apply()
  const appConfig = useAppConfig()
  useHead({ htmlAttrs: { 'data-accent': () => appConfig.ui.colors.primary } })
})
