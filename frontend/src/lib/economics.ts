import type { OilField } from './fields'

/**
 * Field economics — methodology aligned with Tigbourne's source models
 * (the "Simple EOR" and "Drill v CEOR" workbooks). A transparent annual DCF:
 *
 *   • 25% discount rate, ~25-year horizon (Buddy's models)
 *   • geometric production decline; year-1 at full rate
 *   • CEOR uplift = a front-loaded 5-year schedule (+20/15/10/5/0%), scaled by the field's
 *     reservoir suitability, then base decline thereafter
 *   • chemical cost SCALES WITH WATER CUT: ≈$0.30 per bbl of water → $/bbl oil = (WC/(1-WC))·0.30
 *   • per-year shut-in: a year contributes only when revenue − lift − chem > 0
 *
 * Still a screening model (single price rather than a forward curve), but it follows the same
 * practices as the source sheets so the numbers are credible and consistent.
 */

export const ASSUMPTIONS = {
  discountRate: 0.25, // 25% — matches both source models
  years: 25, // project life
  daysPerYear: 365,
  basePrice: 75, // $/bbl reference oil price (Brent-like; overridden by the live feed)
  // Front-loaded CEOR uplift schedule, years 1–5 (then base decline). Scaled by suitability.
  eorSchedule: [0.2, 0.15, 0.1, 0.05, 0],
  chemPerBblWater: 0.3, // $/bbl of produced water (chem cost basis from the CEOR COST sheet)
  ceorInfraPerWell: 2000, // small one-time CEOR infrastructure $/well (year 0)
  // Fallbacks when a field is missing a value
  fallbackDecline: 0.08,
  fallbackLift: 15,
  fallbackWaterCut: 50,
  // Plug & abandonment per well at end of life
  paOnshorePerWell: 500_000,
  paOffshorePerWell: 5_000_000,
}

export type Assumptions = typeof ASSUMPTIONS

/** Analyst-adjustable scenario inputs that override the defaults. */
export interface Scenario {
  price?: number // $/bbl reference oil price
  discountRate?: number // fraction, e.g. 0.25
  chemPerBblWater?: number // $/bbl of produced water
  years?: number // project life
}

/** Bounds + step for the scenario sliders. */
export const SCENARIO_RANGES = {
  price: { min: 20, max: 130, step: 1, label: 'Oil price', unit: '$/bbl', fmt: (v: number) => `$${v}/bbl` },
  discountRate: { min: 0.05, max: 0.3, step: 0.005, label: 'Discount rate', unit: '%', fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
  chemPerBblWater: { min: 0.05, max: 1, step: 0.05, label: 'Chem $/bbl water', unit: '$/bbl', fmt: (v: number) => `$${v.toFixed(2)}` },
  years: { min: 5, max: 30, step: 1, label: 'Project life', unit: 'yr', fmt: (v: number) => `${v} yr` },
} as const

function merge(s: Scenario): Assumptions {
  return {
    ...ASSUMPTIONS,
    basePrice: s.price ?? ASSUMPTIONS.basePrice,
    discountRate: s.discountRate ?? ASSUMPTIONS.discountRate,
    chemPerBblWater: s.chemPerBblWater ?? ASSUMPTIONS.chemPerBblWater,
    years: s.years ?? ASSUMPTIONS.years,
  }
}

/**
 * Brent forward-curve SHAPE (annualized) lifted from Tigbourne's source models — gentle contango
 * to a long-run plateau. Normalized to year 1 and scaled by the scenario/live price, so the price
 * slider sets the year-1 price and the path follows the forward curve.
 */
export const FORWARD_CURVE = [
  62.78, 62.33, 63.54, 65.02, 66.2, 66.92, 67.46, 67.73, 67.74, 67.74, 67.74, 67.74, 67.74,
  67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74,
]
const CURVE_BASE = FORWARD_CURVE[0]

/** Year-t oil price: the year-1 price scaled along the forward-curve shape. */
function priceForYear(t: number, price1: number): number {
  const ratio = FORWARD_CURVE[Math.min(t - 1, FORWARD_CURVE.length - 1)] / CURVE_BASE
  return price1 * ratio
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
  ceorViable: boolean // false when water cut is past the CEOR window (uplift negligible)
  multiplier: number | null // drill$ ÷ CEOR$ cost ratio (Buddy's "multiplier")
  // Buddy DASH-RESULT crossover view: CEOR vs drill NPV swept across water cut.
  curve: { waterCut: number; ceor: number; drill: number }[]
  crossoverWaterCut: number | null // water cut where drilling overtakes CEOR
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
  ceorDeadlineWaterCut: number | null // latest water cut at which starting CEOR still pays (NPV>0)
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

/** Water-cut component — value of intervening is highest early; tapers to ~0 once the field is
 * nearly all water (CEOR can't recover oil that's already been swept). */
function waterScore(waterCutPct: number): number {
  return clamp((95 - waterCutPct) / 80, 0.02, 1)
}

/** Below this CEOR suitability the chemical-recovery window has effectively closed (too watered-out). */
export const CEOR_VIABILITY_MIN = 0.12

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
  const waterCut = f.waterCut ?? ASSUMPTIONS.fallbackWaterCut
  // Prefer the dataset's real P&A figure; fall back to a per-well estimate only when missing.
  const paPerWell = f.shore === 'Offshore' ? ASSUMPTIONS.paOffshorePerWell : ASSUMPTIONS.paOnshorePerWell
  const pa = f.pa != null && f.pa > 0 ? f.pa : wells * paPerWell
  const paEstimated = !(f.pa != null && f.pa > 0)
  return { q0, decline, lift, wells, waterCut, pa, paEstimated }
}

/** CEOR chemical cost per bbl of OIL, scaled by water cut: (WC/(1-WC))·$/bbl-water (CEOR COST sheet). */
function chemPerBblOil(waterCutPct: number, A: Assumptions): number {
  const wc = clamp(waterCutPct / 100, 0, 0.99)
  return (wc / (1 - wc)) * A.chemPerBblWater
}

/** Baseline oil rate (bbl/d) by year — full rate in year 1, geometric decline after. */
function baseCurve(q0: number, decline: number, A: Assumptions): number[] {
  const q: number[] = []
  for (let t = 1; t <= A.years; t++) q.push(q0 * Math.pow(1 - decline, t - 1))
  return q
}

/** CEOR oil rate (bbl/d) by year — front-loaded uplift schedule (×suitability), then base decline. */
function ceorCurve(q0: number, decline: number, s: number, A: Assumptions): number[] {
  const q: number[] = []
  let prev = q0
  for (let t = 1; t <= A.years; t++) {
    if (t <= A.eorSchedule.length) prev = prev * (1 + A.eorSchedule[t - 1] * s)
    else prev = prev * (1 - decline)
    q.push(prev)
  }
  return q
}

/** Discounted NPV of an annual production stream with per-year shut-in (profit floored at 0). */
function npvOfCurve(curve: number[], price1: number, costPerBbl: number, capex: number, pa: number, A: Assumptions): number {
  let npv = -capex
  for (let t = 1; t <= A.years; t++) {
    const netback = priceForYear(t, price1) - costPerBbl
    const profit = Math.max(curve[t - 1] * A.daysPerYear * netback, 0)
    npv += profit / Math.pow(1 + A.discountRate, t)
  }
  npv -= pa / Math.pow(1 + A.discountRate, A.years)
  return npv
}

/** NPV of the field at a given oil price, with and without CEOR. */
function npvAt(f: OilField, price: number, s: number, A: Assumptions) {
  const { q0, decline, lift, wells, waterCut, pa } = inputs(f)
  const chem = chemPerBblOil(waterCut, A)
  const capex = wells * A.ceorInfraPerWell
  const base = npvOfCurve(baseCurve(q0, decline, A), price, lift, 0, pa, A)
  const ceor = npvOfCurve(ceorCurve(q0, decline, s, A), price, lift + chem, capex, pa, A)
  return { base, ceor, capex }
}

/** Cumulative discounted cash-flow curve over the project life at the reference price. */
function cumulativeSeries(f: OilField, s: number, A: Assumptions): YearPoint[] {
  const { q0, decline, lift, wells, waterCut, pa } = inputs(f)
  const { discountRate: r, years, daysPerYear, basePrice: price } = A
  const chem = chemPerBblOil(waterCut, A)
  const capex = wells * A.ceorInfraPerWell
  const baseQ = baseCurve(q0, decline, A)
  const ceorQ = ceorCurve(q0, decline, s, A)

  const pts: YearPoint[] = [{ year: 0, baseCum: 0, ceorCum: -capex }]
  let base = 0
  let ceor = -capex
  for (let t = 1; t <= years; t++) {
    const disc = 1 / Math.pow(1 + r, t)
    const py = priceForYear(t, price)
    base += Math.max(baseQ[t - 1] * daysPerYear * (py - lift), 0) * disc
    ceor += Math.max(ceorQ[t - 1] * daysPerYear * (py - lift - chem), 0) * disc
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
 * Incremental NPV of starting a CEOR program at a given water cut — the "value of early
 * intervention". As water cut rises, two of Buddy's mechanisms compound against you: the
 * recoverable uplift shrinks (reservoir suitability × water score) and the chemical cost per
 * bbl of oil climbs ((WC/(1-WC))·$/bbl-water), so the value falls steeply with later entry.
 */
function interventionCurve(f: OilField, A: Assumptions): InterventionPoint[] {
  const { q0, decline, lift, wells } = inputs(f)
  const rq = reservoirScore(f)
  const capex = wells * A.ceorInfraPerWell
  const baseQ = baseCurve(q0, decline, A)
  const pts: InterventionPoint[] = []
  for (let w = 10; w <= 90; w += 10) {
    const s = clamp(rq * waterScore(w), 0, 1)
    const chem = chemPerBblOil(w, A)
    const ceorQ = ceorCurve(q0, decline, s, A)
    // CEOR uplift at this water cut = incremental oil value − the field-wide chemical flood
    // (charged on ALL treated oil, not just the incremental barrels) − infra. Same basis as the
    // headline uplift and the CEOR-vs-drill card, so the chart ties out at the current water cut.
    let npv = -capex
    for (let t = 1; t <= A.years; t++) {
      const disc = 1 / Math.pow(1 + A.discountRate, t)
      const inc = Math.max(ceorQ[t - 1] - baseQ[t - 1], 0)
      npv += inc * A.daysPerYear * (priceForYear(t, A.basePrice) - lift) * disc
      npv -= ceorQ[t - 1] * A.daysPerYear * chem * disc
    }
    pts.push({ waterCut: w, npv })
  }
  return pts
}

/** The water cut at which the incremental CEOR NPV crosses zero (the "deadline" to intervene). */
function deadlineWaterCut(pts: InterventionPoint[]): number | null {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1].npv
    const b = pts[i].npv
    if (a >= 0 && b < 0) {
      const t = a === b ? 0 : a / (a - b)
      return Math.round(pts[i - 1].waterCut + t * (pts[i].waterCut - pts[i - 1].waterCut))
    }
  }
  return null // never crosses within 10–90% (always pays, or never pays — UI disambiguates)
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

/**
 * "Apply chemicals vs. drill a new well for the same oil" — the core operator decision.
 * CEOR value = the modelled CEOR uplift (NPV with − without). Drilling = sinking wells to add the
 * same peak incremental rate, declining, with no chemical cost. Buddy's "multiplier" = drill$ ÷ CEOR$.
 */
/** NPV of an incremental-oil stream at a given per-bbl cost, net of upfront capex. */
function streamNpvOf(inc: number[], costPerBbl: number, capex: number, A: Assumptions): number {
  let npv = -capex
  for (let t = 1; t <= A.years; t++) {
    npv += Math.max(inc[t - 1] * A.daysPerYear * (priceForYear(t, A.basePrice) - costPerBbl), 0) / Math.pow(1 + A.discountRate, t)
  }
  return npv
}

function computeDrillVsCeor(f: OilField, s: number, A: Assumptions): DrillVsCeor | null {
  const { q0, decline, lift, wells: fieldWells, waterCut } = inputs(f)
  if (q0 <= 0) return null

  // The SAME incremental-oil stream both strategies aim to recover (CEOR's uplift schedule).
  const baseQ = baseCurve(q0, decline, A)
  const ceorQ = ceorCurve(q0, decline, s, A)
  const inc = ceorQ.map((q, i) => Math.max(q - baseQ[i], 0))
  const peakInc = Math.max(...inc, 0)
  if (peakInc <= 0) return null
  const totalBbls = inc.reduce((sum, q) => sum + q * A.daysPerYear, 0)

  const ceorInfra = Math.max(fieldWells, 1) * A.ceorInfraPerWell
  const perWell = f.bblPerWell ?? (f.numWells && f.numWells > 0 && f.oilBblPerDay ? f.oilBblPerDay / f.numWells : null)
  const canDrill = !!(perWell && perWell > 0 && f.drillCost && f.drillCost > 0)
  const drillCapexFor = (incArr: number[]) =>
    (Math.max(1, Math.ceil(Math.max(...incArr, 0) / (perWell as number)))) * (f.drillCost as number)

  // PV of the incremental oil at the wellhead netback (shared by both strategies), and the PV of
  // the chemical flood charged across ALL treated oil (the real CEOR program cost — a field-wide
  // flood, not just the incremental barrels; this is what the headline "CEOR uplift" uses too).
  const incValueOf = (incArr: number[]) => streamNpvOf(incArr, lift, 0, A)
  const chemPVof = (qCurve: number[], chem: number) => {
    let pv = 0
    for (let t = 1; t <= A.years; t++) pv += (qCurve[t - 1] * A.daysPerYear * chem) / Math.pow(1 + A.discountRate, t)
    return pv
  }

  const incValue = incValueOf(inc)
  const wholeChemPV = chemPVof(ceorQ, chemPerBblOil(waterCut, A))
  // CEOR value = incremental oil − field-wide chem flood − infra (≡ the headline uplift).
  const ceorNpv = incValue - wholeChemPV - ceorInfra
  const ceor = { capex: ceorInfra, npv: ceorNpv, perBbl: totalBbls > 0 ? (wholeChemPV + ceorInfra) / totalBbls : 0 }

  // Drilling strategy — sink enough wells to deliver the same incremental oil; capex, no chem.
  let drill: DrillVsCeor['drill'] = null
  if (canDrill) {
    const wells = Math.max(1, Math.ceil(peakInc / (perWell as number)))
    const drillCapex = wells * (f.drillCost as number)
    drill = { wells, capex: drillCapex, npv: incValue - drillCapex, perBbl: totalBbls > 0 ? drillCapex / totalBbls : 0 }
  }

  const best = Math.max(ceorNpv, drill ? drill.npv : -Infinity)
  // Past the CEOR window (very high water cut → negligible uplift), chemicals aren't a real option
  // even if they'd be "cheaper" than drilling the marginal oil — so don't recommend CEOR.
  let recommend: DrillVsCeor['recommend']
  if (s < CEOR_VIABILITY_MIN) recommend = drill && drill.npv > 0 ? 'Drill' : 'Neither'
  else if (best <= 0) recommend = 'Neither'
  else recommend = drill && drill.npv > ceorNpv ? 'Drill' : 'CEOR'
  // Buddy's "multiplier": drilling capex ÷ the CEOR program cost (field-wide chem flood + infra).
  const ceorProgramCost = wholeChemPV + ceorInfra
  const multiplier = drill && ceorProgramCost > 0 ? Math.round((drill.capex / ceorProgramCost) * 10) / 10 : null

  // Crossover view (Buddy's DASH-RESULT): CEOR vs drill NPV swept across intervention water cut.
  const rq = reservoirScore(f)
  const curve: DrillVsCeor['curve'] = []
  let crossoverWaterCut: number | null = null
  for (let w = 10; w <= 90; w += 10) {
    const sw = clamp(rq * waterScore(w), 0, 1)
    const ceorQw = ceorCurve(q0, decline, sw, A)
    const incW = ceorQw.map((q, i) => Math.max(q - baseQ[i], 0))
    const incValW = incValueOf(incW)
    const ceorW = incValW - chemPVof(ceorQw, chemPerBblOil(w, A)) - ceorInfra
    const drillW = canDrill ? incValW - drillCapexFor(incW) : ceorW
    curve.push({ waterCut: w, ceor: ceorW, drill: drillW })
    if (crossoverWaterCut === null && canDrill && drillW > ceorW) crossoverWaterCut = w
  }

  return { incrementalBopd: peakInc, ceor, drill, recommend, ceorViable: s >= CEOR_VIABILITY_MIN, multiplier, curve, crossoverWaterCut }
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
      ceorDeadlineWaterCut: null,
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
  const ceorDeadlineWaterCut = deadlineWaterCut(intervention)
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
    ceorDeadlineWaterCut,
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
