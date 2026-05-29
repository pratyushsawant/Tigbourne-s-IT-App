import { describe, expect, it } from 'vitest'
import { fieldEconomics, suitabilityFactor, usdCompact } from '../economics'
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

  it('water-cut intervention curve is downward-sloping (early intervention worth ~10x late)', () => {
    const curve = fieldEconomics(makeField()).intervention
    expect(curve.length).toBeGreaterThan(2)
    const early = curve[0] // ~10% water cut
    const late = curve[curve.length - 1] // ~90%
    expect(early.npv).toBeGreaterThan(late.npv)
    expect(early.npv / Math.max(late.npv, 1)).toBeGreaterThan(3)
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
