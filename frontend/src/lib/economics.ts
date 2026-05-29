import type { OilField } from './fields'

/**
 * Screening-grade field economics.
 *
 * A simplified discounted-cash-flow (DCF) model used for first-pass field screening —
 * NOT a reserves-grade valuation. It estimates the value of a field under business-as-usual
 * decline ("without CEOR") versus a chemical-enhanced-oil-recovery intervention ("with CEOR"),
 * and the oil price at which each scenario breaks even.
 *
 * The full CEOR vs. drilling NPV engine lives server-side post-MVP; this front-end model uses
 * the same field parameters and transparent assumptions so the screens are meaningful today.
 */

export const ASSUMPTIONS = {
  discountRate: 0.1, // 10% annual discount rate
  years: 15, // project life
  daysPerYear: 365,
  basePrice: 75, // $/bbl reference oil price (Brent-like)
  chemOpex: 9, // incremental $/bbl operating cost while chemical flooding
  // CEOR one-time program capex, scaled by current capacity ($ per bbl/d of oil)
  ceorCapexPerBopd: 1500,
  // Fallbacks when a field is missing a value
  fallbackDecline: 0.08,
  fallbackLift: 15,
  // Plug & abandonment per well at end of life
  paOnshorePerWell: 500_000,
  paOffshorePerWell: 5_000_000,
}

export type Assumptions = typeof ASSUMPTIONS

/** Analyst-adjustable scenario inputs that override the defaults. */
export interface Scenario {
  price?: number // $/bbl reference oil price
  discountRate?: number // fraction, e.g. 0.1
  chemOpex?: number // $/bbl chemical operating cost
  years?: number // project life
}

/** Bounds + step for the scenario sliders. */
export const SCENARIO_RANGES = {
  price: { min: 20, max: 130, step: 1, label: 'Oil price', unit: '$/bbl', fmt: (v: number) => `$${v}/bbl` },
  discountRate: { min: 0.05, max: 0.2, step: 0.005, label: 'Discount rate', unit: '%', fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
  chemOpex: { min: 0, max: 25, step: 0.5, label: 'Chemical opex', unit: '$/bbl', fmt: (v: number) => `$${v.toFixed(1)}/bbl` },
  years: { min: 5, max: 25, step: 1, label: 'Project life', unit: 'yr', fmt: (v: number) => `${v} yr` },
} as const

function merge(s: Scenario): Assumptions {
  return {
    ...ASSUMPTIONS,
    basePrice: s.price ?? ASSUMPTIONS.basePrice,
    discountRate: s.discountRate ?? ASSUMPTIONS.discountRate,
    chemOpex: s.chemOpex ?? ASSUMPTIONS.chemOpex,
    years: s.years ?? ASSUMPTIONS.years,
  }
}

export interface YearPoint {
  year: number
  baseCum: number // cumulative discounted cash flow, no CEOR
  ceorCum: number // cumulative discounted cash flow, with CEOR
}

export interface BreakEvenPoint {
  price: number
  base: number // NPV at this oil price, no CEOR
  ceor: number // NPV at this oil price, with CEOR
}

export interface InterventionPoint {
  waterCut: number // % water cut at which CEOR is started
  npv: number // incremental NPV created by intervening at this point
}

export interface DrillVsCeor {
  incrementalBopd: number // target incremental oil both strategies aim to recover
  ceor: { capex: number; npv: number; perBbl: number }
  drill: { wells: number; capex: number; npv: number; perBbl: number } | null
  recommend: 'CEOR' | 'Drill' | 'Neither'
}

export interface FieldEconomics {
  ok: boolean
  reason?: string
  suitability: number // 0–1, how well-suited the field is to chemical recovery
  npvBase: number
  npvCeor: number
  uplift: number // npvCeor − npvBase
  breakEvenBase: number | null // $/bbl where NPV (no CEOR) = 0
  breakEvenCeor: number | null // $/bbl where NPV (CEOR) = 0
  crossover: number | null // $/bbl where CEOR NPV overtakes base NPV
  capex: number
  paCost: number // plug & abandonment cost included in the NPV (field total, undiscounted)
  paEstimated: boolean // true when P&A was estimated rather than taken from the dataset
  drillVsCeor: DrillVsCeor | null // chemicals vs. drill-a-new-well comparison
  series: YearPoint[]
  sweep: BreakEvenPoint[]
  intervention: InterventionPoint[] // incremental NPV vs. water cut at intervention
  currentWaterCut: number | null
  earlyVsLate: number | null // ×: value intervening at 10% vs. the field's current water cut
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Reservoir-quality component of CEOR suitability (independent of water cut). */
function reservoirScore(f: OilField): number {
  // API gravity — sweet spot 16–40°, tapering outside
  let apiScore = 0.15
  if (f.api != null) {
    if (f.api >= 16 && f.api <= 40) apiScore = 1
    else if (f.api < 16) apiScore = clamp(f.api / 16, 0.1, 1)
    else apiScore = clamp(1 - (f.api - 40) / 30, 0.1, 1)
  }
  // Temperature — chemicals degrade above ~130 °C
  let tempScore = 0.6
  if (f.bht != null) tempScore = f.bht <= 130 ? 1 : clamp(1 - (f.bht - 130) / 60, 0.05, 1)
  return apiScore * tempScore
}

/** Water-cut component — value of intervening is highest early (low water cut). */
function waterScore(waterCutPct: number): number {
  return clamp((95 - waterCutPct) / 80, 0.15, 1)
}

/** How effective a chemical-recovery program is on this field, 0 (no point) – 1 (ideal). */
export function suitabilityFactor(f: OilField): number {
  const ws = f.waterCut != null ? waterScore(f.waterCut) : 0.6
  return clamp(reservoirScore(f) * ws, 0, 1)
}

function inputs(f: OilField) {
  const q0 = f.oilBblPerDay ?? 0
  const decline = clamp((f.declinePct ?? ASSUMPTIONS.fallbackDecline * 100) / 100, 0.02, 0.35)
  const lift = f.liftCost ?? ASSUMPTIONS.fallbackLift
  const wells = f.numWells && f.numWells > 0 ? f.numWells : 20
  // Prefer the dataset's real P&A figure; fall back to a per-well estimate only when missing.
  const paPerWell = f.shore === 'Offshore' ? ASSUMPTIONS.paOffshorePerWell : ASSUMPTIONS.paOnshorePerWell
  const pa = f.pa != null && f.pa > 0 ? f.pa : wells * paPerWell
  const paEstimated = !(f.pa != null && f.pa > 0)
  return { q0, decline, lift, pa, paEstimated }
}

/** Net present value of the field at a given oil price, with and without CEOR. */
function npvAt(f: OilField, price: number, s: number, A: Assumptions) {
  const { q0, decline, lift, pa } = inputs(f)
  const { discountRate: r, years, daysPerYear, chemOpex, ceorCapexPerBopd } = A

  // CEOR effect, scaled by suitability: an initial production uplift and a gentler decline.
  const ceorUplift = 1 + 0.25 * s
  const ceorDecline = decline * (1 - 0.5 * s)
  const capex = q0 * ceorCapexPerBopd

  let base = 0
  let ceor = -capex // CEOR program spent up front (year 0)

  for (let t = 1; t <= years; t++) {
    const disc = 1 / Math.pow(1 + r, t)

    const qBase = q0 * Math.pow(1 - decline, t)
    base += qBase * daysPerYear * (price - lift) * disc

    const qCeor = q0 * ceorUplift * Math.pow(1 - ceorDecline, t)
    ceor += qCeor * daysPerYear * (price - lift - chemOpex) * disc
  }

  // End-of-life plug & abandonment, discounted
  const paDisc = pa / Math.pow(1 + r, years)
  base -= paDisc
  ceor -= paDisc

  return { base, ceor, capex }
}

/** Cumulative discounted cash-flow curve over the project life at the reference price. */
function cumulativeSeries(f: OilField, s: number, A: Assumptions): YearPoint[] {
  const { q0, decline, lift, pa } = inputs(f)
  const { discountRate: r, years, daysPerYear, chemOpex, ceorCapexPerBopd, basePrice: price } = A
  const ceorUplift = 1 + 0.25 * s
  const ceorDecline = decline * (1 - 0.5 * s)
  const capex = q0 * ceorCapexPerBopd

  const pts: YearPoint[] = [{ year: 0, baseCum: 0, ceorCum: -capex }]
  let base = 0
  let ceor = -capex
  for (let t = 1; t <= years; t++) {
    const disc = 1 / Math.pow(1 + r, t)
    base += q0 * Math.pow(1 - decline, t) * daysPerYear * (price - lift) * disc
    ceor += q0 * ceorUplift * Math.pow(1 - ceorDecline, t) * daysPerYear * (price - lift - chemOpex) * disc
    let b = base
    let c = ceor
    if (t === years) {
      const paDisc = pa / Math.pow(1 + r, years)
      b -= paDisc
      c -= paDisc
    }
    pts.push({ year: t, baseCum: b, ceorCum: c })
  }
  return pts
}

function zeroCrossing(sweep: BreakEvenPoint[], pick: (p: BreakEvenPoint) => number): number | null {
  for (let i = 1; i < sweep.length; i++) {
    const a = pick(sweep[i - 1])
    const b = pick(sweep[i])
    if (a <= 0 && b > 0) {
      const t = a === b ? 0 : -a / (b - a)
      return Math.round((sweep[i - 1].price + t * (sweep[i].price - sweep[i - 1].price)) * 10) / 10
    }
  }
  return null
}

function crossoverPrice(sweep: BreakEvenPoint[]): number | null {
  for (let i = 1; i < sweep.length; i++) {
    const da = sweep[i - 1].ceor - sweep[i - 1].base
    const db = sweep[i].ceor - sweep[i].base
    if (da <= 0 && db > 0) {
      const t = da === db ? 0 : -da / (db - da)
      return Math.round((sweep[i - 1].price + t * (sweep[i].price - sweep[i - 1].price)) * 10) / 10
    }
  }
  return null
}

/**
 * Incremental NPV of starting a CEOR program at a given water cut.
 * Intervening early (low water cut) captures far more mobile oil — the "value lost by waiting".
 * Calibrated so the optimum (≈10% water cut) is roughly 10× the value at a late (≈80%) start.
 */
function interventionCurve(f: OilField, A: Assumptions): InterventionPoint[] {
  const { q0, decline, lift } = inputs(f)
  const rq = reservoirScore(f)
  const netback = A.basePrice - lift - A.chemOpex
  const capex = q0 * A.ceorCapexPerBopd
  const { discountRate: r, years, daysPerYear } = A
  const pts: InterventionPoint[] = []
  for (let w = 10; w <= 90; w += 10) {
    const s = clamp(rq * waterScore(w), 0, 1)
    // Value-of-waiting multiplier: e^{k(0.8 − w)} ⇒ ≈10× from 10% to 80% water cut
    const early = Math.exp(3.29 * (0.8 - w / 100))
    const upliftRate = q0 * 0.25 * s * early
    const d2 = decline * (1 - 0.5 * s)
    let npv = -capex
    for (let t = 1; t <= years; t++) {
      npv += upliftRate * Math.pow(1 - d2, t) * daysPerYear * netback * (1 / Math.pow(1 + r, t))
    }
    pts.push({ waterCut: w, npv })
  }
  return pts
}

function npvAtWaterCut(pts: InterventionPoint[], w: number): number {
  if (w <= pts[0].waterCut) return pts[0].npv
  if (w >= pts[pts.length - 1].waterCut) return pts[pts.length - 1].npv
  for (let i = 1; i < pts.length; i++) {
    if (w <= pts[i].waterCut) {
      const t = (w - pts[i - 1].waterCut) / (pts[i].waterCut - pts[i - 1].waterCut)
      return pts[i - 1].npv + t * (pts[i].npv - pts[i - 1].npv)
    }
  }
  return pts[pts.length - 1].npv
}

/** Discounted NPV of an incremental-oil program: initial rate qInc declining at d, net of capex. */
function incrementalNpv(qInc: number, d: number, netback: number, capex: number, A: Assumptions): number {
  let npv = -capex
  for (let t = 1; t <= A.years; t++) {
    npv += qInc * Math.pow(1 - d, t) * A.daysPerYear * netback * (1 / Math.pow(1 + A.discountRate, t))
  }
  return npv
}

/**
 * "Apply chemicals vs. drill a new well for the same oil" — the core operator decision.
 * Both strategies target the same incremental rate; we compare capex, NPV and $/incremental-bbl.
 */
function computeDrillVsCeor(f: OilField, s: number, A: Assumptions): DrillVsCeor | null {
  const { q0, decline, lift } = inputs(f)
  if (q0 <= 0) return null

  // Target incremental oil = the CEOR production uplift
  const incrementalBopd = q0 * 0.25 * s
  const totalBbls = incrementalBopd * A.daysPerYear * A.years // rough undiscounted volume for $/bbl

  // CEOR strategy
  const ceorCapex = q0 * A.ceorCapexPerBopd
  const ceorNpv = incrementalNpv(incrementalBopd, decline * (1 - 0.5 * s), A.basePrice - lift - A.chemOpex, ceorCapex, A)
  const ceor = { capex: ceorCapex, npv: ceorNpv, perBbl: totalBbls > 0 ? ceorCapex / totalBbls : 0 }

  // Drilling strategy — only when we have the inputs to size a well program
  let drill: DrillVsCeor['drill'] = null
  const perWell = f.bblPerWell ?? (f.numWells && f.numWells > 0 && f.oilBblPerDay ? f.oilBblPerDay / f.numWells : null)
  if (perWell && perWell > 0 && f.drillCost && f.drillCost > 0) {
    const wells = Math.max(1, Math.ceil(incrementalBopd / perWell))
    const drillCapex = wells * f.drillCost
    // New wells decline at the field rate (no chemical opex)
    const drillNpv = incrementalNpv(wells * perWell, decline, A.basePrice - lift, drillCapex, A)
    drill = { wells, capex: drillCapex, npv: drillNpv, perBbl: totalBbls > 0 ? drillCapex / totalBbls : 0 }
  }

  let recommend: DrillVsCeor['recommend'] = 'Neither'
  const best = Math.max(ceor.npv, drill ? drill.npv : -Infinity)
  if (best > 0) recommend = drill && drill.npv > ceor.npv ? 'Drill' : 'CEOR'

  return { incrementalBopd, ceor, drill, recommend }
}

export function fieldEconomics(f: OilField, scenario: Scenario = {}): FieldEconomics {
  const A = merge(scenario)
  const s = suitabilityFactor(f)
  if (!f.oilBblPerDay || f.oilBblPerDay <= 0) {
    return {
      ok: false,
      reason: 'No current oil production recorded for this field — economics cannot be modelled.',
      suitability: s,
      npvBase: 0,
      npvCeor: 0,
      uplift: 0,
      breakEvenBase: null,
      breakEvenCeor: null,
      crossover: null,
      capex: 0,
      paCost: f.pa ?? 0,
      paEstimated: !(f.pa != null && f.pa > 0),
      drillVsCeor: null,
      series: [],
      sweep: [],
      intervention: [],
      currentWaterCut: f.waterCut,
      earlyVsLate: null,
    }
  }

  const { base: npvBase, ceor: npvCeor, capex } = npvAt(f, A.basePrice, s, A)
  const series = cumulativeSeries(f, s, A)

  const sweep: BreakEvenPoint[] = []
  for (let price = 10; price <= 130; price += 5) {
    const { base, ceor } = npvAt(f, price, s, A)
    sweep.push({ price, base, ceor })
  }

  const intervention = interventionCurve(f, A)
  const optimumNpv = intervention[0]?.npv ?? 0
  const currentNpv = f.waterCut != null ? npvAtWaterCut(intervention, f.waterCut) : optimumNpv
  const earlyVsLate = f.waterCut != null && currentNpv > 0 ? Math.round((optimumNpv / currentNpv) * 10) / 10 : null
  const { pa: paCost, paEstimated } = inputs(f)

  return {
    ok: true,
    suitability: s,
    npvBase,
    npvCeor,
    uplift: npvCeor - npvBase,
    breakEvenBase: zeroCrossing(sweep, (p) => p.base),
    breakEvenCeor: zeroCrossing(sweep, (p) => p.ceor),
    crossover: crossoverPrice(sweep),
    capex,
    paCost,
    paEstimated,
    drillVsCeor: computeDrillVsCeor(f, s, A),
    series,
    sweep,
    intervention,
    currentWaterCut: f.waterCut,
    earlyVsLate,
  }
}

/** Fast CEOR-uplift estimate at default assumptions — for ranking opportunities across many fields. */
export function quickUplift(f: OilField): number {
  if (!f.oilBblPerDay || f.oilBblPerDay <= 0) return -Infinity
  const s = suitabilityFactor(f)
  const { base, ceor } = npvAt(f, ASSUMPTIONS.basePrice, s, ASSUMPTIONS)
  return ceor - base
}

/** Compact USD for labels/tooltips: $1.05T / $1.2B / $340M / $12M / $900k */
export function usdCompact(v: number): string {
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(0)}k`
  return `${sign}$${a.toFixed(0)}`
}

/** Shorter USD for chart axis ticks (fewer decimals so labels never overflow). */
export function usdAxis(v: number): string {
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(1)}T`
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(0)}B`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(0)}M`
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(0)}k`
  return `${sign}$${Math.round(a)}`
}
