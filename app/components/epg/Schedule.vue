<script setup lang="ts">
import type { EpgProgramme } from '#shared/types/epg'

const props = defineProps<{ streamId: number }>()

const api = useEpgApi()
const clock = useClock(30_000)
const programmes = ref<EpgProgramme[]>([])
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    programmes.value = await api.getSchedule(props.streamId)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.streamId, load, { immediate: true })

// Group under day headings so a guide spanning midnight stays readable.
const days = computed(() => {
  const groups: { label: string, items: EpgProgramme[] }[] = []
  for (const programme of programmes.value) {
    if (programme.stop <= clock.value) continue
    const label = formatDay(programme.start, clock.value)
    const last = groups.at(-1)
    if (last?.label === label) last.items.push(programme)
    else groups.push({ label, items: [programme] })
  }
  return groups
})
</script>

<template>
  <div class="max-h-80 overflow-y-auto border-t border-default pt-2">
    <div v-if="loading" class="flex flex-col gap-2">
      <USkeleton v-for="i in 4" :key="i" class="h-8 w-full" />
    </div>

    <p v-else-if="failed" class="text-sm text-muted">
      Couldn't load the schedule.
      <UButton size="xs" variant="link" @click="load">
        Try again
      </UButton>
    </p>

    <p v-else-if="days.length === 0" class="text-sm text-muted">
      No upcoming programmes in the guide.
    </p>

    <template v-else>
      <section v-for="day in days" :key="day.label" class="mb-2">
      <h3 class="sticky top-0 bg-default py-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {{ day.label }}
      </h3>
      <ol class="flex flex-col">
        <li
          v-for="programme in day.items"
          :key="programme.start"
          class="flex gap-3 rounded px-2 py-1.5 text-sm"
          :class="programme.start <= clock && clock < programme.stop ? 'bg-primary/10' : ''"
          :aria-current="programme.start <= clock && clock < programme.stop ? 'true' : undefined"
        >
          <span class="w-18 shrink-0 whitespace-nowrap tabular-nums text-muted">{{ formatClock(programme.start) }}</span>
          <span class="min-w-0">
            <span class="block truncate" :class="programme.start <= clock && clock < programme.stop ? 'font-semibold' : ''">
              {{ programme.title }}
            </span>
            <span v-if="programme.description" class="line-clamp-1 text-xs text-muted">
              {{ programme.description }}
            </span>
          </span>
        </li>
      </ol>
      </section>
    </template>
  </div>
</template>
