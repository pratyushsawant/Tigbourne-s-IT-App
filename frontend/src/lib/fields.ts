import raw from '../data/fields.json'

export interface OilField {
  id: number
  region: string
  country: string
  operator: string
  oilfield: string
  oilBblPerDay: number | null
  numWells: number | null
  bblPerWell: number | null
  waterBblPerDay: number | null
  liquidBblPerDay: number | null
  waterCut: number | null // percent 0–100
  declinePct: number | null
  liftCost: number | null // $/bbl
  bht: number | null // °C
  tds: number | null // ppm
  api: number | null // API gravity
  shore: string // Onshore / Offshore
  depthFt: number | null
  drillCost: number | null // $/well
  wellsPerYear: number | null
  sulfur: number | null // %
  porosity: number | null // fraction or %
  permeability: number | null // md
  resPh: number | null
  pa: number | null // plug & abandonment cost estimate ($, field total)
}

export const FIELDS: OilField[] = raw as OilField[]

/** Column / parameter metadata — drives the grid, filters and detail view. */
export type Unit = '' | 'bbl/d' | '%' | '$/bbl' | '°C' | 'ppm' | '°API' | 'ft' | '$' | 'md' | '/yr'

export interface ColumnDef {
  key: keyof OilField
  label: string
  short: string
  unit: Unit
  group: 'Identity' | 'Production' | 'Reservoir' | 'Location' | 'Cost'
  numeric: boolean
  /** show in the default grid */
  grid?: boolean
  /** A field worth offering as a range filter */
  filterable?: boolean
  /** notes shown in detail view */
  why?: string
  format?: (v: number) => string
}

const usd = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`

export const COLUMNS: ColumnDef[] = [
  { key: 'oilfield', label: 'Oil Field', short: 'Field', unit: '', group: 'Identity', numeric: false, grid: true },
  { key: 'operator', label: 'Operator', short: 'Operator', unit: '', group: 'Identity', numeric: false, grid: true },
  { key: 'country', label: 'Country', short: 'Country', unit: '', group: 'Identity', numeric: false, grid: true },
  { key: 'region', label: 'Region', short: 'Region', unit: '', group: 'Identity', numeric: false, grid: true },
  { key: 'shore', label: 'Onshore / Offshore', short: 'Shore', unit: '', group: 'Location', numeric: false, grid: true },
  { key: 'oilBblPerDay', label: 'Oil Production', short: 'Oil', unit: 'bbl/d', group: 'Production', numeric: true, grid: true, filterable: true, why: 'Gross barrels of oil per day — shows how far the field has declined and how much oil remains.', format: (v) => v.toLocaleString() },
  { key: 'waterCut', label: 'Water Cut', short: 'W-Cut', unit: '%', group: 'Production', numeric: true, grid: true, filterable: true, why: 'How much of total liquid is water. The single biggest driver of chemical-recovery timing — value of intervening early (10%) vs. late (80%) is roughly 10×.' },
  { key: 'api', label: 'API Gravity', short: 'API', unit: '°API', group: 'Reservoir', numeric: true, grid: true, filterable: true, why: 'Oil thickness. Sweet spot for chemical recovery is 16–40 °API.' },
  { key: 'bht', label: 'Reservoir Temp', short: 'BHT', unit: '°C', group: 'Reservoir', numeric: true, grid: true, filterable: true, why: 'Bottom-hole temperature. Above ~130 °C most recovery chemicals stop being effective.' },
  { key: 'liftCost', label: 'Lifting Cost', short: 'Lift', unit: '$/bbl', group: 'Cost', numeric: true, grid: true, filterable: true, why: 'Lifting + transport + marketing cost per barrel — the core input to the break-even price.', format: (v) => `$${v.toFixed(1)}` },
  { key: 'numWells', label: 'Producing Wells', short: 'Wells', unit: '', group: 'Production', numeric: true, filterable: true, format: (v) => v.toLocaleString() },
  { key: 'bblPerWell', label: 'Barrels / Well', short: 'bbl/well', unit: 'bbl/d', group: 'Production', numeric: true, format: (v) => v.toLocaleString() },
  { key: 'waterBblPerDay', label: 'Water Production', short: 'Water', unit: 'bbl/d', group: 'Production', numeric: true, format: (v) => v.toLocaleString() },
  { key: 'liquidBblPerDay', label: 'Total Liquid', short: 'Liquid', unit: 'bbl/d', group: 'Production', numeric: true, format: (v) => v.toLocaleString() },
  { key: 'declinePct', label: 'Decline Rate', short: 'Decline', unit: '%', group: 'Production', numeric: true, filterable: true },
  { key: 'tds', label: 'Salinity (TDS)', short: 'TDS', unit: 'ppm', group: 'Reservoir', numeric: true, format: (v) => v.toLocaleString() },
  { key: 'sulfur', label: 'Sulfur', short: 'Sulfur', unit: '%', group: 'Reservoir', numeric: true },
  { key: 'porosity', label: 'Porosity', short: 'Poro', unit: '%', group: 'Reservoir', numeric: true },
  { key: 'permeability', label: 'Permeability', short: 'Perm', unit: 'md', group: 'Reservoir', numeric: true, format: (v) => v.toLocaleString() },
  { key: 'resPh', label: 'Reservoir pH', short: 'pH', unit: '', group: 'Reservoir', numeric: true },
  { key: 'depthFt', label: 'Depth', short: 'Depth', unit: 'ft', group: 'Location', numeric: true, filterable: true, format: (v) => v.toLocaleString() },
  { key: 'drillCost', label: 'Drill & Completion', short: 'Drill', unit: '$', group: 'Cost', numeric: true, filterable: true, format: usd },
  { key: 'pa', label: 'Plug & Abandonment', short: 'P&A', unit: '$', group: 'Cost', numeric: true, filterable: true, why: 'Estimated cost to safely close the field at end of life. Most valuations ignore it; including it is a key differentiator — and essential for a complete NPV. Offshore P&A is far higher than onshore.', format: usd },
  { key: 'wellsPerYear', label: 'New Wells / Year', short: 'New/yr', unit: '/yr', group: 'Cost', numeric: true },
]

export const COL_BY_KEY: Record<string, ColumnDef> = Object.fromEntries(COLUMNS.map((c) => [c.key, c]))

export function fmt(col: ColumnDef, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (!col.numeric) return String(value)
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  if (col.format) return col.format(n)
  // porosity stored as fraction in many rows
  if (col.key === 'porosity' && n <= 1) return `${(n * 100).toFixed(0)}`
  if (col.unit === '%') return `${n}`
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export const REGIONS = Array.from(new Set(FIELDS.map((f) => f.region))).sort()
export const SHORES = ['Onshore', 'Offshore']

function range(key: keyof OilField): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const f of FIELDS) {
    const v = f[key]
    if (typeof v === 'number' && !Number.isNaN(v)) {
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  return [lo === Infinity ? 0 : lo, hi === -Infinity ? 0 : hi]
}

export const RANGES: Record<string, [number, number]> = Object.fromEntries(
  COLUMNS.filter((c) => c.filterable && c.numeric).map((c) => [c.key, range(c.key)]),
)
