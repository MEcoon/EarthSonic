import { oceanExpeditions } from '../data/oceanExpeditions'
import { getOceanRegion } from '../data/oceanRegions'

export const DISCOVERIES_STORAGE_KEY = 'earthsonic.my-discoveries.v1'
export const DISCOVERY_NOTE_LIMIT = 280

export type SavedRegionRecord = { regionId: string; savedAt: string }
export type CompletedExpeditionRecord = {
  expeditionId: string
  title: string
  completedAt: string
  visitedRegionIds: string[]
}
export type DiscoveriesStore = {
  version: 1
  savedRegions: SavedRegionRecord[]
  completedExpeditions: CompletedExpeditionRecord[]
  notes: Record<string, string>
}

export const emptyDiscoveries = (): DiscoveriesStore => ({
  version: 1,
  savedRegions: [],
  completedExpeditions: [],
  notes: {},
})

const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))

/** Drops malformed, unknown, or obsolete references without throwing or rewriting the stored value. */
export function normalizeDiscoveries(value: unknown): DiscoveriesStore {
  if (!value || typeof value !== 'object') return emptyDiscoveries()
  const data = value as Partial<DiscoveriesStore>
  if (data.version !== 1) return emptyDiscoveries()

  const savedRegions: SavedRegionRecord[] = []
  const seenRegions = new Set<string>()
  if (Array.isArray(data.savedRegions)) {
    for (const item of data.savedRegions) {
      if (!item || typeof item !== 'object') continue
      const record = item as SavedRegionRecord
      const region = getOceanRegion(record.regionId)
      if (!region || region.availabilityStatus !== 'available' || !validDate(record.savedAt) || seenRegions.has(record.regionId)) continue
      seenRegions.add(record.regionId)
      savedRegions.push({ regionId: record.regionId, savedAt: record.savedAt })
    }
  }

  const completedExpeditions: CompletedExpeditionRecord[] = []
  const seenExpeditions = new Set<string>()
  if (Array.isArray(data.completedExpeditions)) {
    for (const item of data.completedExpeditions) {
      if (!item || typeof item !== 'object') continue
      const record = item as CompletedExpeditionRecord
      const expedition = oceanExpeditions.find((candidate) => candidate.id === record.expeditionId)
      if (!expedition || expedition.regionIds.length === 0 || !validDate(record.completedAt) || seenExpeditions.has(record.expeditionId)) continue
      const visitedRegionIds = Array.isArray(record.visitedRegionIds)
        ? [...new Set(record.visitedRegionIds.filter((id) => expedition.regionIds.includes(id) && getOceanRegion(id)?.availabilityStatus === 'available'))]
        : []
      if (visitedRegionIds.length === 0) continue
      seenExpeditions.add(expedition.id)
      completedExpeditions.push({ expeditionId: expedition.id, title: expedition.title, completedAt: record.completedAt, visitedRegionIds })
    }
  }

  const notes: Record<string, string> = {}
  if (data.notes && typeof data.notes === 'object' && !Array.isArray(data.notes)) {
    for (const [regionId, note] of Object.entries(data.notes)) {
      if (getOceanRegion(regionId) && typeof note === 'string' && note.trim()) notes[regionId] = note.slice(0, DISCOVERY_NOTE_LIMIT)
    }
  }

  return { version: 1, savedRegions, completedExpeditions, notes }
}

export function readDiscoveries(): DiscoveriesStore {
  try {
    const raw = window.localStorage.getItem(DISCOVERIES_STORAGE_KEY)
    return raw ? normalizeDiscoveries(JSON.parse(raw) as unknown) : emptyDiscoveries()
  } catch {
    return emptyDiscoveries()
  }
}

export function writeDiscoveries(value: DiscoveriesStore): boolean {
  try {
    window.localStorage.setItem(DISCOVERIES_STORAGE_KEY, JSON.stringify(normalizeDiscoveries(value)))
    return true
  } catch {
    return false
  }
}
