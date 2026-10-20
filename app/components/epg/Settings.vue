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

const statusLine = computed(() => {
  const value = status.value
  if (!value) return null
  if (value.state === 'building') return 'Downloading and matching guides… large guides can take a minute.'
  if (value.state === 'never') return 'The guide hasn\'t been built yet.'
  if (value.builtAt) {
    const builtAt = Date.parse(value.builtAt)
    return `Updated ${formatDay(builtAt)} at ${formatClock(builtAt)} · refreshes every 12 hours`
  }
  return null
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
  <div class="flex flex-col gap-8">
    <div v-if="loading" class="flex flex-col gap-2">
      <USkeleton class="h-4 w-24" />
      <USkeleton class="h-28 w-full rounded-2xl" />
    </div>

    <UAlert v-else-if="loadError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="loadError" />

    <template v-else>
      <GroupedSection
        title="TV Guide"
        footer="Shows what's on now and next. Your provider's own guide is always used; add XMLTV sources below to fill in the channels it doesn't cover."
      >
        <GroupedRow
          :label="status && coverage !== null
            ? `${status.matchedChannels.toLocaleString()} of ${status.totalChannels.toLocaleString()} channels have a guide (${coverage}%)`
            : 'Channels with a guide'"
          icon="i-lucide-calendar-range"
          icon-class="bg-gradient-to-br from-amber-400 to-orange-500"
        >
          <template v-if="statusLine" #detail>
            {{ statusLine }}
          </template>
        </GroupedRow>
        <GroupedRow
          v-if="status && status.state !== 'never' && coverage !== null"
          label="Matching"
          icon="i-lucide-link-2"
          icon-class="bg-gradient-to-br from-sky-400 to-blue-600"
          :detail="`By EPG id ${status.matchedBy.id.toLocaleString()} · similar id ${status.matchedBy.normalizedId.toLocaleString()} · name ${status.matchedBy.name.toLocaleString()}. Name matches can occasionally pick another regional version of a channel.`"
        />
        <GroupedRow v-if="status?.state === 'error'" label="The last update failed" :detail="status.error ?? undefined" icon="i-lucide-circle-alert" icon-class="bg-red-500" />
        <div class="flex justify-end px-4 py-2.5">
          <UButton
            icon="i-lucide-refresh-cw"
            size="sm"
            variant="soft"
            color="neutral"
            :loading="status?.state === 'building'"
            :disabled="saving"
            @click="refresh"
          >
            {{ status?.state === 'building' ? 'Updating…' : 'Refresh Now' }}
          </UButton>
        </div>
      </GroupedSection>

      <GroupedSection title="Guide Sources">
        <GroupedRow
          label="Your provider's guide"
          icon="i-lucide-server"
          icon-class="bg-gradient-to-br from-zinc-400 to-zinc-600"
        >
          <template #detail>
            {{ describeSource(providerStatus) }}
            <template v-if="providerStatus?.ok && providerStatus.programmes === 0">
              — your provider publishes no programme data.
            </template>
          </template>
        </GroupedRow>
        <GroupedRow
          v-for="url in sources"
          :key="url"
          :label="url"
          icon="i-lucide-link"
          :icon-class="sourceStatus(url)?.ok === false ? 'bg-red-500' : 'bg-gradient-to-br from-emerald-400 to-green-600'"
        >
          <template #detail>
            <span :class="sourceStatus(url)?.ok === false ? 'text-error' : ''">{{ describeSource(sourceStatus(url)) }}</span>
          </template>
          <UButton
            icon="i-lucide-trash-2"
            size="sm"
            variant="ghost"
            color="error"
            :disabled="saving"
            :aria-label="`Remove ${url}`"
            @click="removeSource(url)"
          />
        </GroupedRow>
        <form class="flex flex-col gap-1 px-4 py-3" @submit.prevent="addSource">
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
          <p v-if="urlError" class="text-[13px] text-error">
            {{ urlError }}
          </p>
        </form>
      </GroupedSection>

      <GroupedSection
        v-if="suggestions.length"
        title="Suggested Sources"
        footer="Free guides from epgshare01, a third-party community project. Channels are matched by id and name, so coverage depends on your provider's channel names."
      >
        <GroupedRow
          v-for="source in suggestions"
          :key="source.url"
          :label="source.label"
          :detail="source.detail"
          icon="i-lucide-calendar-plus"
          icon-class="bg-gradient-to-br from-violet-400 to-purple-600"
        >
          <UButton size="sm" variant="soft" icon="i-lucide-plus" :disabled="saving" @click="addSuggested(source.url)">
            Add
          </UButton>
        </GroupedRow>
      </GroupedSection>
    </template>
  </div>
</template>
