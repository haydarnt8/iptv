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
  <UCard>
    <template #header>
      <h2 class="font-semibold">
        Appearance
      </h2>
    </template>

    <div class="flex flex-col gap-5">
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-sm font-semibold">
          Theme
        </legend>
        <!-- The colour-mode preference lives in localStorage, so the server can't render the right selection. -->
        <ClientOnly>
          <UFieldGroup>
            <UButton
              v-for="mode in modes"
              :key="mode.value"
              :icon="mode.icon"
              color="neutral"
              :variant="colorMode.preference === mode.value ? 'solid' : 'outline'"
              :aria-pressed="colorMode.preference === mode.value"
              @click="colorMode.preference = mode.value"
            >
              {{ mode.label }}
            </UButton>
          </UFieldGroup>
          <template #fallback>
            <USkeleton class="h-8 w-60" />
          </template>
        </ClientOnly>
      </fieldset>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-sm font-semibold">
          Accent colour
        </legend>
        <div class="flex flex-wrap gap-3" role="radiogroup" aria-label="Accent colour">
          <button
            v-for="color in ACCENT_COLORS"
            :key="color"
            type="button"
            role="radio"
            :aria-checked="accent === color"
            :aria-label="color"
            :title="color"
            class="flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-(--ui-bg) transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-border-inverted)"
            :class="[ACCENT_SWATCH_CLASS[color], accent === color ? 'ring-2 ring-(--ui-border-inverted)' : '']"
            @click="accent = color"
          >
            <UIcon v-if="accent === color" name="i-lucide-check" class="size-4 text-white" />
          </button>
        </div>
      </fieldset>
    </div>
  </UCard>
</template>
