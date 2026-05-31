import { describe, expect, it } from 'vitest'
import { ASSUMPTIONS, fieldEconomics, suitabilityFactor, usdCompact } from '../economics'
import { FIELDS, type OilField } from '../fields'

// A synthetic, well-suited producing field — lets us assert exact behaviour without data drift.
function makeField(over: Partial<OilField> = {}): OilField {
  return {
    id: 1,
    region: 'Test',
    country: 'Testland',
    operator: 'Test Op',
    oilfield: 'Test Field',
    oilBblPerDay: 50000,
    numWells: 40,
    bblPerWell: 1250,
    waterBblPerDay: 20000,
    liquidBblPerDay: 70000,
    waterCut: 30,
    declinePct: 8,
    liftCost: 15,
    bht: 90,
    tds: 50000,
    api: 30,
    shore: 'Onshore',
    depthFt: 8000,
    drillCost: 5_000_000,
    wellsPerYear: 3,
    sulfur: 0.5,
    porosity: 20,
    permeability: 200,
    resPh: 6.5,
    pa: 25_000_000,
    ...over,
  }
}

describe('suitabilityFactor', () => {
  it('is always within [0,1] for every real field', () => {
    for (const f of FIELDS) {
      const s = suitabilityFactor(f)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(1)
    }
  })

  it('rewards the chemical sweet spot (API 16-40, cool, low water cut) over a hostile field', () => {
    const ideal = suitabilityFactor(makeField({ api: 28, bht: 80, waterCut: 15 }))
    const hostile = suitabilityFactor(makeField({ api: 9, bht: 160, waterCut: 90 }))
    expect(ideal).toBeGreaterThan(hostile)
    expect(ideal).toBeGreaterThan(0.6)
  })
})

describe('fieldEconomics', () => {
  it('returns ok=false when there is no production', () => {
    const eco = fieldEconomics(makeField({ oilBblPerDay: 0 }))
    expect(eco.ok).toBe(false)
    expect(eco.series).toHaveLength(0)
  })

  it('NPV rises monotonically with oil price', () => {
    const f = makeField()
    const low = fieldEconomics(f, { price: 40 }).npvBase
    const mid = fieldEconomics(f, { price: 70 }).npvBase
    const high = fieldEconomics(f, { price: 100 }).npvBase
    expect(mid).toBeGreaterThan(low)
    expect(high).toBeGreaterThan(mid)
  })

  it('uses the real P&A figure from the dataset, not an estimate', () => {
    const eco = fieldEconomics(makeField({ pa: 25_000_000 }))
    expect(eco.paEstimated).toBe(false)
    expect(eco.paCost).toBe(25_000_000)
  })

  it('falls back to an estimated P&A when the field has none', () => {
    const eco = fieldEconomics(makeField({ pa: null }))
    expect(eco.paEstimated).toBe(true)
    expect(eco.paCost).toBeGreaterThan(0)
  })

  it('break-even is a true zero-crossing: NPV is negative below it and positive above', () => {
    const f = makeField()
    const eco = fieldEconomics(f)
    expect(eco.breakEvenBase).not.toBeNull()
    const be = eco.breakEvenBase as number
    expect(fieldEconomics(f, { price: be - 5 }).npvBase).toBeLessThan(0)
    expect(fieldEconomics(f, { price: be + 5 }).npvBase).toBeGreaterThan(0)
  })

  it('a well-suited field gains value from CEOR; a hostile one does not', () => {
    const good = fieldEconomics(makeField({ api: 28, bht: 80, waterCut: 15 }))
    const bad = fieldEconomics(makeField({ api: 9, bht: 165, waterCut: 92 }))
    expect(good.uplift).toBeGreaterThan(0)
    expect(good.uplift).toBeGreaterThan(bad.uplift)
  })

  it('produces a drill-vs-CEOR comparison with a valid recommendation', () => {
    const eco = fieldEconomics(makeField())
    expect(eco.drillVsCeor).not.toBeNull()
    const d = eco.drillVsCeor!
    expect(d.incrementalBopd).toBeGreaterThan(0)
    expect(['CEOR', 'Drill', 'Neither']).toContain(d.recommend)
    expect(Number.isFinite(d.ceor.npv)).toBe(true)
  })

  it('intervention NPV at the field water cut ties to the headline uplift (same chem basis)', () => {
    // Field at 40% water cut → the curve point at 40% should ≈ the headline CEOR uplift.
    const eco = fieldEconomics(makeField({ waterCut: 40 }))
    const at40 = eco.intervention.find((p) => p.waterCut === 40)!
    expect(Math.abs(at40.npv - eco.uplift) / Math.abs(eco.uplift)).toBeLessThan(0.05)
  })

  it('water-cut intervention curve is downward-sloping (early intervention worth substantially more)', () => {
    const curve = fieldEconomics(makeField()).intervention
    expect(curve.length).toBeGreaterThan(2)
    const early = curve[0] // ~10% water cut
    const late = curve[curve.length - 1] // ~90%
    expect(early.npv).toBeGreaterThan(late.npv)
    expect(early.npv / Math.max(late.npv, 1)).toBeGreaterThan(2)
  })

  it('exposes a drill-vs-CEOR cost multiplier when a well program can be sized', () => {
    const d = fieldEconomics(makeField()).drillVsCeor!
    expect(d.drill).not.toBeNull()
    expect(d.multiplier).toBeGreaterThan(0)
  })

  it('recommends CEOR for a suitable field where drilling the same oil is far more expensive (Ghawar-like)', () => {
    // Regression: drilling was valued on a front-loaded peak stream, inflating its NPV so it
    // "won" even when sinking hundreds of wells obviously costs more than a chemical program.
    const ghawar = makeField({
      oilBblPerDay: 3_350_000, numWells: 605, bblPerWell: 5537, waterCut: 45,
      declinePct: 5.7, liftCost: 11, api: 36.4, bht: 98.2, shore: 'Onshore', drillCost: 5_800_000,
    })
    const d = fieldEconomics(ghawar).drillVsCeor!
    expect(d.recommend).toBe('CEOR')
    expect(d.ceor.npv).toBeGreaterThan(d.drill!.npv)
  })

  it("card's CEOR NPV equals the headline CEOR uplift (same field-wide chem basis)", () => {
    const eco = fieldEconomics(makeField())
    const card = eco.drillVsCeor!
    expect(Math.abs(card.ceor.npv - eco.uplift) / Math.abs(eco.uplift)).toBeLessThan(0.02)
  })

  it('does not recommend CEOR once water cut is past the viable window (Shengli-like, 93%)', () => {
    const f = makeField({
      oilBblPerDay: 85_000, numWells: 620, bblPerWell: 137, waterCut: 93,
      api: 31, bht: 88, liftCost: 26, drillCost: 5_500_000, declinePct: 9,
    })
    const d = fieldEconomics(f).drillVsCeor!
    expect(d.ceorViable).toBe(false)
    expect(d.recommend).not.toBe('CEOR')
  })

  it('both strategies are valued on the same incremental oil (CEOR beats drill only by avoiding capex)', () => {
    // On the identical stream, CEOR pays chem opex, drilling pays capex; the gap equals
    // drilling capex minus the chem PV — never the artifact of comparing different streams.
    const d = fieldEconomics(makeField({ waterCut: 20, drillCost: 8_000_000 })).drillVsCeor!
    expect(d.recommend).toBe('CEOR') // low water cut → cheap chem → CEOR wins
  })
})

// Methodology aligned with Buddy's source models.
describe('Buddy-aligned methodology', () => {
  it('uses a 25% discount rate over ~25 years by default', () => {
    expect(ASSUMPTIONS.discountRate).toBe(0.25)
    expect(ASSUMPTIONS.years).toBe(25)
  })

  it('chemical cost rises with water cut, so a wetter field gets less CEOR uplift', () => {
    const dry = fieldEconomics(makeField({ waterCut: 20 })).uplift
    const wet = fieldEconomics(makeField({ waterCut: 85 })).uplift
    expect(dry).toBeGreaterThan(wet)
  })

  it('front-loads the CEOR uplift: the with/without gap widens fastest in the first 5 years', () => {
    const s = fieldEconomics(makeField()).series
    const gap = (y: number) => {
      const p = s.find((x) => x.year === y)!
      return p.ceorCum - p.baseCum
    }
    // Gap should be growing through the uplift-schedule years.
    expect(gap(5)).toBeGreaterThan(gap(1))
  })
})

describe('usdCompact', () => {
  it('formats magnitudes with B/M/k and a sign', () => {
    expect(usdCompact(1_200_000_000)).toBe('$1.20B')
    expect(usdCompact(3_400_000)).toBe('$3.4M')
    expect(usdCompact(12_000)).toBe('$12k')
    expect(usdCompact(-3_400_000)).toBe('-$3.4M')
  })
})
