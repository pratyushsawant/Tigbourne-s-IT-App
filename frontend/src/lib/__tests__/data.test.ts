import { describe, expect, it } from 'vitest'
import { COLUMNS, FIELDS, REGIONS } from '../fields'
import { AUDIT, INTEGRITY_SUMMARY, MISMATCHES } from '../integrity'

describe('fields dataset', () => {
  it('has the expected field count and 6 regions', () => {
    expect(FIELDS.length).toBe(1978)
    expect(REGIONS.length).toBe(6)
  })

  it('water cut is normalized to a 0–100 percentage (Asia mixed convention handled)', () => {
    for (const f of FIELDS) {
      if (f.waterCut != null) {
        expect(f.waterCut).toBeGreaterThanOrEqual(0)
        expect(f.waterCut).toBeLessThanOrEqual(100)
      }
    }
  })

  it('shore is normalized to Onshore/Offshore (with Both preserved from source)', () => {
    const allowed = new Set(['Onshore', 'Offshore', 'Both'])
    for (const f of FIELDS) expect(allowed.has(f.shore)).toBe(true)
  })

  it('P&A is populated for at least 99% of fields', () => {
    const withPa = FIELDS.filter((f) => f.pa != null && f.pa > 0).length
    expect(withPa).toBeGreaterThanOrEqual(1976)
  })

  it('exposes a P&A column in the grid metadata', () => {
    expect(COLUMNS.some((c) => c.key === 'pa')).toBe(true)
  })

  it('every field has the identity fields populated', () => {
    for (const f of FIELDS) {
      expect(f.oilfield).toBeTruthy()
      expect(f.country).toBeTruthy()
      expect(f.region).toBeTruthy()
    }
  })
})

describe('data integrity', () => {
  it('carries the audit log and all flagged mismatches', () => {
    expect(AUDIT.length).toBe(7)
    expect(MISMATCHES.length).toBe(79)
  })

  it('converts the source ratio column into a true percentage (1.0 ratio -> 100%)', () => {
    // Source max ratio is ~49 (Diff/Expected); after x100 the max diff must exceed 100%.
    const max = Math.max(...MISMATCHES.map((m) => m.diffPct))
    expect(max).toBeGreaterThan(100)
  })

  it('counts severe mismatches as >=100% diff and they sort to the top', () => {
    const severe = MISMATCHES.filter((m) => m.diffPct >= 100).length
    expect(INTEGRITY_SUMMARY.severe).toBe(severe)
    // sorted descending by severity
    for (let i = 1; i < MISMATCHES.length; i++) {
      expect(MISMATCHES[i - 1].diffPct).toBeGreaterThanOrEqual(MISMATCHES[i].diffPct)
    }
  })
})
