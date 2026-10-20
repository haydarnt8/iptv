<script setup lang="ts">
// iOS "inset grouped" list section: a small caps header, rounded rows, an explanatory footer.
defineProps<{
  title?: string
  footer?: string
}>()

defineSlots<{
  default: () => unknown
  footer?: () => unknown
  actions?: () => unknown
}>()
</script>

<template>
  <section class="flex flex-col gap-1.5">
    <div v-if="title || $slots.actions" class="flex items-end justify-between gap-2 px-4">
      <h2 v-if="title" class="text-[13px] font-medium uppercase tracking-wide text-muted">
        {{ title }}
      </h2>
      <slot name="actions" />
    </div>
    <div class="flex flex-col divide-y divide-default overflow-hidden rounded-2xl bg-elevated">
      <slot />
    </div>
    <div v-if="footer || $slots.footer" class="px-4 text-[13px] leading-snug text-muted">
      <slot name="footer">
        {{ footer }}
      </slot>
    </div>
  </section>
</template>
