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
  <div class="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
    <UIcon :name="icon" class="size-10 text-muted" />
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <p v-if="description" class="max-w-sm text-sm text-muted">
      {{ description }}
    </p>
    <UButton v-if="actionLabel" :to="actionTo" @click="onActionClick">
      {{ actionLabel }}
    </UButton>
  </div>
</template>
