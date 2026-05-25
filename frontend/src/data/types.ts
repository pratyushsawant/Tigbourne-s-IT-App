export interface OilField {
  id: string
  fieldName: string
  operator: string
  country: string
  region: string
  type: 'Onshore' | 'Offshore'
  status: 'Active' | 'Declining' | 'Inactive'
  depth_m: number
  // Production
  oilRate_bpd: number
  liquidRate_bpd: number
  waterRate_bpd: number
  waterCut_pct: number
  // Reservoir
  apiGravity: number
  temperature_c: number
  salinity_ppm: number
  viscosity_cp: number
  porosity_pct: number
  permeability_md: number
  // Costs
  liftingCost_usd: number
  drillingCost_usd: number
  paEstimate_usd: number | null
}

export interface FilterState {
  search: string
  country: string
  type: string
  status: string
  waterCutMin: number
  waterCutMax: number
  apiGravityMin: number
  apiGravityMax: number
}

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  column: keyof OilField
  direction: SortDirection
}

export interface User {
  email: string
  name: string
  role: 'admin' | 'institutional' | 'individual'
}
