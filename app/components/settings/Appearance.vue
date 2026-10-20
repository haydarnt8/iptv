<script setup lang="ts">
import { ACCENT_COLORS, ACCENT_SWATCH_CLASS } from '~/utils/theme'

const colorMode = useColorMode()
const { accent } = useAccentColor()

const modes = [
  { value: 'system', label: 'System', icon: 'i-lucide-monitor' },
  { value: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide-moon' }
] as const
</script>

<template>
  <GroupedSection title="Appearance">
    <GroupedRow label="Theme" icon="i-lucide-sun-moon" icon-class="bg-gradient-to-br from-indigo-400 to-indigo-600">
      <!-- The colour-mode preference lives in localStorage, so the server can't render the right selection. -->
      <ClientOnly>
        <div class="inline-flex gap-0.5 rounded-full bg-accented/70 p-0.5" role="radiogroup" aria-label="Theme">
          <button
            v-for="mode in modes"
            :key="mode.value"
            type="button"
            role="radio"
            :aria-checked="colorMode.preference === mode.value"
            class="flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
            :class="colorMode.preference === mode.value ? 'bg-default text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
            @click="colorMode.preference = mode.value"
          >
            <UIcon :name="mode.icon" class="size-3.5" />
            <span class="hidden sm:inline">{{ mode.label }}</span>
          </button>
        </div>
        <template #fallback>
          <USkeleton class="h-7 w-48 rounded-full" />
        </template>
      </ClientOnly>
    </GroupedRow>

    <GroupedRow label="Accent Colour" icon="i-lucide-palette" icon-class="bg-gradient-to-br from-pink-400 to-rose-600">
      <template #detail>
      <div class="mt-2 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Accent colour">
        <button
          v-for="color in ACCENT_COLORS"
          :key="color"
          type="button"
          role="radio"
          :aria-checked="accent === color"
          :aria-label="color"
          :title="color"
          class="flex size-7 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-(--ui-bg-elevated) transition active:scale-90 focus-visible:ring-2 focus-visible:ring-(--ui-border-inverted)"
          :class="[ACCENT_SWATCH_CLASS[color], accent === color ? 'ring-2 ring-(--ui-border-inverted)' : '']"
          @click="accent = color"
        >
          <UIcon v-if="accent === color" name="i-lucide-check" class="size-3.5 text-white mix-blend-difference" />
        </button>
      </div>
      </template>
    </GroupedRow>
  </GroupedSection>
</template>
