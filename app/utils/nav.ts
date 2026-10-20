export interface AppNavItem {
  label: string
  icon: string
  to: string
}

/** Always-visible destinations: desktop sidebar + mobile bottom tab bar. */
export const primaryNavItems: AppNavItem[] = [
  { label: 'Home', icon: 'i-lucide-house', to: '/' },
  { label: 'Live TV', icon: 'i-lucide-tv', to: '/live' },
  { label: 'Movies', icon: 'i-lucide-film', to: '/movies' },
  { label: 'Series', icon: 'i-lucide-clapperboard', to: '/series' },
  { label: 'Search', icon: 'i-lucide-search', to: '/search' }
]

/** Secondary destinations: desktop sidebar (second group) + mobile "more" menu. */
export const secondaryNavItems: AppNavItem[] = [
  { label: 'TV Guide', icon: 'i-lucide-calendar-range', to: '/live/guide' },
  { label: 'Favorites', icon: 'i-lucide-heart', to: '/favorites' },
  { label: 'Recently Watched', icon: 'i-lucide-history', to: '/recently-watched' },
  { label: 'Profiles', icon: 'i-lucide-users', to: '/profiles' },
  { label: 'Settings', icon: 'i-lucide-settings', to: '/settings' }
]
