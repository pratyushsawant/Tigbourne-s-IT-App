import raw from '../data/integrity.json'
import { FIELDS } from './fields'

interface RawIntegrity {
  auditHeaders: string[]
  audit: (string | number)[][]
  mismatchHeaders: string[]
  mismatches: (string | number)[][]
}

const data = raw as RawIntegrity

export interface AuditEntry {
  n: number | string
  sheet: string
  range: string
  type: string
  what: string
  why: string
  date: string
}

export interface Mismatch {
  sheet: string
  row: number | string
  country: string
  field: string
  reported: number
  wells: number
  perWell: number
  expected: number
  diff: number
  diffPct: number
}

export const AUDIT: AuditEntry[] = data.audit.map((r) => ({
  n: r[0],
  sheet: String(r[1]),
  range: String(r[2]),
  type: String(r[3]),
  what: String(r[4]),
  why: String(r[5]),
  date: String(r[6]),
}))

export const MISMATCHES: Mismatch[] = data.mismatches
  .map((r) => ({
    sheet: String(r[0]),
    row: r[1],
    country: String(r[2]),
    field: String(r[3]),
    reported: Number(r[4]) || 0,
    wells: Number(r[5]) || 0,
    perWell: Number(r[6]) || 0,
    expected: Number(r[7]) || 0,
    diff: Number(r[8]) || 0,
    // Source column is Diff ÷ Expected (a ratio: 1.0 = 100%). Convert to a true percentage.
    diffPct: (Number(r[9]) || 0) * 100,
  }))
  .sort((a, b) => b.diffPct - a.diffPct)

/** Share of fields that carry a P&A figure (completeness metric). */
export function paCoverage() {
  const withPa = FIELDS.filter((f) => f.pa != null && f.pa > 0).length
  return { withPa, total: FIELDS.length, pct: Math.round((withPa / FIELDS.length) * 1000) / 10 }
}

export const INTEGRITY_SUMMARY = {
  validated: FIELDS.length,
  flagged: MISMATCHES.length,
  auditEntries: AUDIT.length,
  severe: MISMATCHES.filter((m) => m.diffPct >= 100).length, // reported ≥2× the expected E×F
}
