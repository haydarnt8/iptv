<script setup lang="ts">
// One row of a grouped list: optional icon tile, label (+ detail line), trailing value or control.
// With `to` the whole row is a link with a chevron, like an iOS navigation row.
defineProps<{
  label: string
  detail?: string
  value?: string
  icon?: string
  /** Tailwind classes for the icon tile, e.g. "bg-blue-500". */
  iconClass?: string
  to?: string
}>()

defineSlots<{
  default?: () => unknown
  detail?: () => unknown
}>()

const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <component
    :is="to ? NuxtLink : 'div'"
    :to="to"
    class="flex min-h-12 items-center gap-3 px-4 py-2.5"
    :class="to ? 'outline-none transition hover:bg-accented/50 focus-visible:bg-accented/50 active:bg-accented' : ''"
  >
    <span v-if="icon" class="flex size-7 shrink-0 items-center justify-center rounded-[7px] text-white" :class="iconClass ?? 'bg-neutral-500'">
      <UIcon :name="icon" class="size-4" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="text-[15px] text-highlighted [overflow-wrap:anywhere]">{{ label }}</span>
      <span v-if="detail || $slots.detail" class="text-[13px] text-muted">
        <slot name="detail">{{ detail }}</slot>
      </span>
    </span>
    <span v-if="value" class="shrink-0 text-right text-[15px] text-muted">{{ value }}</span>
    <slot />
    <UIcon v-if="to" name="i-lucide-chevron-right" class="size-4 shrink-0 text-dimmed" />
  </component>
</template>
