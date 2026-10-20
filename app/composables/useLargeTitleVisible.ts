/** Whether the current page's large title (PageTitle) is on screen; the toolbar hides its own title then. */
export function useLargeTitleVisible() {
  return useState('large-title-visible', () => false)
}
