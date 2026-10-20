<script setup lang="ts">
import * as z from 'zod'
import type { EpgSourceStatus, EpgStatus } from '#shared/types/epg'

const api = useEpgApi()
const toast = useToast()

const status = ref<EpgStatus | null>(null)
const sources = ref<string[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const saving = ref(false)
const newUrl = ref('')
const urlError = ref<string | null>(null)

const urlSchema = z.string().trim().url().refine(url => /^https?:\/\//i.test(url))

// Free community-maintained XMLTV files (epgshare01), offered as one-click starting points.
// Nothing is added unless the user picks one.
const SUGGESTED_SOURCES = [
  { label: 'All countries', detail: 'Largest coverage · about 195 MB · takes a minute or two to process', url: 'https://epgshare01.online/epgshare01/epg_ripper_ALL_SOURCES1.xml.gz' },
  { label: 'United Arab Emirates', detail: 'About 2 MB', url: 'https://epgshare01.online/epgshare01/epg_ripper_AE1.xml.gz' },
  { label: 'United Kingdom', detail: 'About 3 MB', url: 'https://epgshare01.online/epgshare01/epg_ripper_UK1.xml.gz' }
]
const suggestions = computed(() => SUGGESTED_SOURCES.filter(source => !sources.value.includes(source.url)))

let pollTimer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

function pollWhileBuilding() {
  if (status.value?.state !== 'building' || pollTimer) return
  pollTimer = setInterval(async () => {
    try {
      status.value = await api.getStatus()
    } catch {
      // Keep the last known status; the next tick retries.
    }
    if (status.value?.state !== 'building') {
      stopPolling()
      if (status.value?.state === 'ready') toast.add({ title: 'TV guide updated', color: 'success' })
    }
  }, 3000)
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const [nextStatus, nextSources] = await Promise.all([api.getStatus(), api.getSources()])
    status.value = nextStatus
    sources.value = nextSources
    pollWhileBuilding()
  } catch (error) {
    loadError.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

async function refresh() {
  try {
    status.value = await api.refresh()
    pollWhileBuilding()
  } catch (error) {
    toast.add({ title: 'Couldn\'t refresh the guide', description: getErrorMessage(error), color: 'error' })
  }
}

async function saveSources(next: string[], successTitle: string) {
  saving.value = true
  try {
    sources.value = await api.setSources(next)
    toast.add({ title: successTitle, description: 'Refreshing the guide…', color: 'success' })
    await refresh()
  } catch (error) {
    toast.add({ title: 'Couldn\'t save guide sources', description: getErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

function addSource() {
  const parsed = urlSchema.safeParse(newUrl.value)
  if (!parsed.success) {
    urlError.value = 'Enter a full http:// or https:// URL to an XMLTV file (.xml or .xml.gz).'
    return
  }
  if (sources.value.includes(parsed.data)) {
    urlError.value = 'That source is already added.'
    return
  }
  urlError.value = null
  newUrl.value = ''
  saveSources([...sources.value, parsed.data], 'Guide source added')
}

function addSuggested(url: string) {
  saveSources([...sources.value, url], 'Guide source added')
}

function removeSource(url: string) {
  saveSources(sources.value.filter(source => source !== url), 'Guide source removed')
}

function sourceStatus(label: string): EpgSourceStatus | null {
  return status.value?.sources.find(source => source.label === label) ?? null
}

const providerStatus = computed(() => status.value?.sources.find(source => source.isProvider) ?? null)

const coverage = computed(() => {
  const value = status.value
  if (!value || value.totalChannels === 0) return null
  return Math.round((value.matchedChannels / value.totalChannels) * 100)
})

function describeSource(source: EpgSourceStatus | null): string {
  if (!source) return 'Not loaded yet.'
  if (!source.ok) return source.error ?? 'Failed to load.'
  return `${source.channels.toLocaleString()} channels · ${source.programmes.toLocaleString()} programmes`
}

onMounted(load)
onBeforeUnmount(stopPolling)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="font-semibold">
            TV guide (EPG)
          </h2>
          <p class="text-sm text-muted">
            Shows what's on now and next in Live TV. Your provider's own guide is always used; add XMLTV guide
            sources to fill in channels it doesn't cover.
          </p>
        </div>
        <UButton
          icon="i-lucide-refresh-cw"
          size="sm"
          variant="soft"
          :loading="status?.state === 'building'"
          :disabled="loading || saving"
          @click="refresh"
        >
          {{ status?.state === 'building' ? 'Updating…' : 'Refresh' }}
        </UButton>
      </div>
    </template>

    <div v-if="loading" class="flex flex-col gap-2">
      <USkeleton class="h-5 w-2/3" />
      <USkeleton class="h-16 w-full" />
    </div>

    <UAlert v-else-if="loadError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="loadError" />

    <div v-else class="flex flex-col gap-5">
      <section aria-label="Guide status" class="flex flex-col gap-1 text-sm">
        <p v-if="status?.state === 'building'" class="text-muted">
          Downloading and matching guides… large guides can take a minute.
        </p>
        <p v-else-if="status?.state === 'error'" class="text-error">
          The last update failed: {{ status.error }}
        </p>
        <p v-else-if="status?.state === 'never'" class="text-muted">
          The guide hasn't been built yet.
        </p>
        <template v-if="status && status.state !== 'never' && coverage !== null">
          <p>
            <span class="font-semibold">{{ status.matchedChannels.toLocaleString() }}</span>
            of {{ status.totalChannels.toLocaleString() }} channels have a guide ({{ coverage }}%) ·
            {{ status.programmes.toLocaleString() }} programmes
          </p>
          <p class="text-muted">
            Matched by EPG id {{ status.matchedBy.id.toLocaleString() }} · similar id
            {{ status.matchedBy.normalizedId.toLocaleString() }} · channel name {{ status.matchedBy.name.toLocaleString() }}.
            Name matches can occasionally pick a different regional version of a channel.
          </p>
          <p v-if="status.builtAt" class="text-muted">
            Updated {{ formatDay(Date.parse(status.builtAt)) }} at {{ formatClock(Date.parse(status.builtAt)) }} ·
            refreshes automatically every 12 hours.
          </p>
        </template>
      </section>

      <section aria-label="Guide sources" class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold">
          Sources
        </h3>
        <ul class="flex flex-col divide-y divide-default rounded-lg border border-default">
          <li class="flex items-center gap-3 p-3">
            <UIcon name="i-lucide-server" class="size-5 shrink-0 text-muted" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">
                Your provider's guide
              </p>
              <p class="text-xs text-muted">
                {{ describeSource(providerStatus) }}
                <template v-if="providerStatus?.ok && providerStatus.programmes === 0">
                  — your provider currently publishes no programme data.
                </template>
              </p>
            </div>
          </li>
          <li v-for="url in sources" :key="url" class="flex items-center gap-3 p-3">
            <UIcon
              :name="sourceStatus(url)?.ok === false ? 'i-lucide-circle-alert' : 'i-lucide-link'"
              class="size-5 shrink-0"
              :class="sourceStatus(url)?.ok === false ? 'text-error' : 'text-muted'"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium" :title="url">
                {{ url }}
              </p>
              <p class="text-xs" :class="sourceStatus(url)?.ok === false ? 'text-error' : 'text-muted'">
                {{ describeSource(sourceStatus(url)) }}
              </p>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              :disabled="saving"
              :aria-label="`Remove ${url}`"
              @click="removeSource(url)"
            />
          </li>
        </ul>

        <form class="flex flex-col gap-1" @submit.prevent="addSource">
          <div class="flex gap-2">
            <UInput
              v-model="newUrl"
              placeholder="https://example.com/guide.xml.gz"
              aria-label="XMLTV guide URL"
              class="flex-1"
              :disabled="saving"
            />
            <UButton type="submit" icon="i-lucide-plus" :loading="saving">
              Add
            </UButton>
          </div>
          <p v-if="urlError" class="text-xs text-error">
            {{ urlError }}
          </p>
        </form>
      </section>

      <section v-if="suggestions.length" aria-labelledby="epg-suggestions" class="flex flex-col gap-2">
        <div>
          <h3 id="epg-suggestions" class="text-sm font-semibold">
            Suggested sources
          </h3>
          <p class="text-xs text-muted">
            Free guides from epgshare01, a third-party community project. Channels are matched by id and name, so
            coverage depends on your provider's channel names.
          </p>
        </div>
        <ul class="flex flex-col divide-y divide-default rounded-lg border border-default">
          <li v-for="source in suggestions" :key="source.url" class="flex items-center gap-3 p-3">
            <UIcon name="i-lucide-calendar-plus" class="size-5 shrink-0 text-muted" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">
                {{ source.label }}
              </p>
              <p class="text-xs text-muted">
                {{ source.detail }}
              </p>
            </div>
            <UButton size="xs" variant="soft" icon="i-lucide-plus" :disabled="saving" @click="addSuggested(source.url)">
              Add
            </UButton>
          </li>
        </ul>
      </section>
    </div>
  </UCard>
</template>
