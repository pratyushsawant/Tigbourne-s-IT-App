import { apiGet } from './api'
import { applyDataset, type OilField } from './fields'
import { applyIntegrity, refreshIntegritySummary, type RawIntegrity } from './integrity'

interface FieldsResponse {
  fields: OilField[]
  ranges?: Record<string, [number, number]>
  regions?: string[]
  version?: number
  updatedAt?: string
}

export const datasetMeta: { version: number; updatedAt: string | null; live: boolean } = {
  version: 0,
  updatedAt: null,
  live: false,
}

/**
 * Fetch live data from the API and swap it in before the app renders. A no-op when
 * VITE_API_BASE is unset or the backend is unreachable — the bundled JSON stays in place,
 * so the app always renders (offline/demo mode included).
 */
export async function bootstrapData(): Promise<void> {
  const data = await apiGet<FieldsResponse>('/api/data/fields')
  if (data && Array.isArray(data.fields) && data.fields.length) {
    applyDataset(data.fields, data.ranges, data.regions)
    datasetMeta.version = data.version ?? 0
    datasetMeta.updatedAt = data.updatedAt ?? null
    datasetMeta.live = true
  }
  const integ = await apiGet<RawIntegrity>('/api/data/integrity')
  if (integ && Array.isArray(integ.mismatches)) {
    applyIntegrity(integ)
  }
  refreshIntegritySummary()
}
