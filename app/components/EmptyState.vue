<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    icon: string
    title: string
    description?: string
    actionLabel?: string
    actionTo?: string
  }>(),
  {
    description: undefined,
    actionLabel: undefined,
    actionTo: undefined
  }
)

const emit = defineEmits<{ action: [] }>()

function onActionClick() {
  if (!props.actionTo) {
    emit('action')
  }
}
</script>

<template>
  <!-- Like Apple's ContentUnavailableView: large glyph, title, short explanation, one action. -->
  <div class="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
    <UIcon :name="icon" class="mb-2 size-14 text-dimmed" />
    <h2 class="text-xl font-semibold tracking-tight text-highlighted">
      {{ title }}
    </h2>
    <p v-if="description" class="max-w-sm text-[15px] leading-snug text-muted">
      {{ description }}
    </p>
    <UButton v-if="actionLabel" :to="actionTo" size="lg" class="mt-3 px-5" @click="onActionClick">
      {{ actionLabel }}
    </UButton>
  </div>
</template>
