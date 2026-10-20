export interface AppNavItem {
  label: string
  icon: string
  to: string
}

export interface AppNavSection {
  label: string | null
  items: AppNavItem[]
}

const home: AppNavItem = { label: 'Home', icon: 'i-lucide-house', to: '/' }
const search: AppNavItem = { label: 'Search', icon: 'i-lucide-search', to: '/search' }
const liveTv: AppNavItem = { label: 'Live TV', icon: 'i-lucide-tv', to: '/live' }
const guide: AppNavItem = { label: 'TV Guide', icon: 'i-lucide-calendar-range', to: '/live/guide' }
const movies: AppNavItem = { label: 'Movies', icon: 'i-lucide-film', to: '/movies' }
const series: AppNavItem = { label: 'Series', icon: 'i-lucide-clapperboard', to: '/series' }
const favorites: AppNavItem = { label: 'Favorites', icon: 'i-lucide-heart', to: '/favorites' }
const recent: AppNavItem = { label: 'Recently Watched', icon: 'i-lucide-history', to: '/recently-watched' }
const profiles: AppNavItem = { label: 'Profiles', icon: 'i-lucide-users', to: '/profiles' }
const settings: AppNavItem = { label: 'Settings', icon: 'i-lucide-settings', to: '/settings' }

/** Desktop sidebar, grouped like a macOS source list. */
export const sidebarSections: AppNavSection[] = [
  { label: null, items: [home, search] },
  { label: 'Watch', items: [liveTv, guide, movies, series] },
  { label: 'Library', items: [favorites, recent] }
]

/** Pinned to the bottom of the sidebar. */
export const sidebarFooterItems: AppNavItem[] = [profiles, settings]

/** Phone tab bar. */
export const tabBarItems: AppNavItem[] = [home, liveTv, movies, series, search]

/** Phone "More" sheet: everything not in the tab bar. */
export const moreItems: AppNavItem[] = [guide, favorites, recent, profiles, settings]

export const allNavItems: AppNavItem[] = [home, search, liveTv, guide, movies, series, favorites, recent, profiles, settings]

/** The nav item for a path: the longest matching route prefix ("/live/guide" beats "/live"). */
export function findNavItem(path: string): AppNavItem | null {
  let best: AppNavItem | null = null
  for (const item of allNavItems) {
    const matches = item.to === '/' ? path === '/' : path === item.to || path.startsWith(`${item.to}/`)
    if (matches && (!best || item.to.length > best.to.length)) best = item
  }
  return best
}
