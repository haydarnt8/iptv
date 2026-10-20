// Component defaults tuned toward Apple's controls: capsule buttons with a press response,
// filled (borderless) fields, rounded cards, and translucent menus and dialogs.
const onPrimary = 'text-[color:var(--ui-on-primary)]'
const glassContent = 'bg-default/80 backdrop-blur-2xl backdrop-saturate-150 shadow-xl ring-[0.5px] ring-default rounded-2xl'

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'rose',
      neutral: 'zinc'
    },
    button: {
      slots: { base: 'rounded-full transition active:scale-[0.97] disabled:active:scale-100' },
      compoundVariants: [{ color: 'primary', variant: 'solid', class: onPrimary }]
    },
    badge: {
      slots: { base: 'rounded-full' },
      compoundVariants: [{ color: 'primary', variant: 'solid', class: onPrimary }]
    },
    card: {
      slots: { root: 'rounded-2xl' },
      variants: { variant: { soft: { root: 'bg-elevated' } } },
      defaultVariants: { variant: 'soft' }
    },
    input: {
      slots: { base: 'rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50' },
      variants: { variant: { soft: 'bg-elevated hover:bg-accented/70 focus:bg-elevated' } },
      defaultVariants: { variant: 'soft' }
    },
    selectMenu: {
      slots: { base: 'rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50', content: glassContent },
      variants: { variant: { soft: 'bg-elevated hover:bg-accented/70 focus:bg-elevated' } },
      defaultVariants: { variant: 'soft' }
    },
    modal: {
      slots: { content: 'bg-default/85 backdrop-blur-2xl backdrop-saturate-150 divide-default/60' },
      variants: { fullscreen: { false: { content: 'rounded-3xl shadow-2xl ring-[0.5px] ring-default' } } }
    },
    popover: { slots: { content: glassContent } },
    dropdownMenu: { slots: { content: glassContent } },
    toast: { slots: { root: 'bg-default/80 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl shadow-xl ring-[0.5px] ring-default' } },
    tabs: { slots: { list: 'rounded-full', indicator: 'rounded-full shadow-sm', trigger: 'rounded-full' } },
    slider: { slots: { thumb: 'bg-white ring-0 shadow-md' } }
  }
})
