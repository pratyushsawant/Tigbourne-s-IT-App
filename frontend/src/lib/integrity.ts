import raw from '../data/integrity.json'
import { FIELDS } from './fields'

export interface RawIntegrity {
  auditHeaders: string[]
  audit: (string | number)[][]
  mismatchHeaders: string[]
  mismatches: (string | number)[][]
}

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

function parseAudit(d: RawIntegrity): AuditEntry[] {
  return (d.audit || []).map((r) => ({
    n: r[0],
    sheet: String(r[1]),
    range: String(r[2]),
    type: String(r[3]),
    what: String(r[4]),
    why: String(r[5]),
    date: String(r[6]),
  }))
}

function parseMismatches(d: RawIntegrity): Mismatch[] {
  return (d.mismatches || [])
    .map((r) => ({
      sheet: String(r[0]),
      row: r[1],
      country: String(r[2]),
      field: String(r[3]),
      reported: Number(r[4]) || 0,
      wells: Number(r[5]) || 0,
      perWell: Number(r[6]) || 0,
      expected: Number(r[7]) || 0,
      // Source column is Diff ÷ Expected (a ratio: 1.0 = 100%). Convert to a true percentage.
      diffPct: (Number(r[9]) || 0) * 100,
      diff: Number(r[8]) || 0,
    }))
    .sort((a, b) => b.diffPct - a.diffPct)
}

export let AUDIT: AuditEntry[] = parseAudit(raw as RawIntegrity)
export let MISMATCHES: Mismatch[] = parseMismatches(raw as RawIntegrity)

/** Share of fields that carry a P&A figure (completeness metric). */
export function paCoverage() {
  const withPa = FIELDS.filter((f) => f.pa != null && f.pa > 0).length
  const total = FIELDS.length || 1
  return { withPa, total: FIELDS.length, pct: Math.round((withPa / total) * 1000) / 10 }
}

function summary() {
  return {
    validated: FIELDS.length,
    flagged: MISMATCHES.length,
    auditEntries: AUDIT.length,
    severe: MISMATCHES.filter((m) => m.diffPct >= 100).length, // reported ≥2× the expected E×F
  }
}

export let INTEGRITY_SUMMARY = summary()

/** Swap in integrity data fetched from the API (called once at startup, before render). */
export function applyIntegrity(d: RawIntegrity): void {
  AUDIT = parseAudit(d)
  MISMATCHES = parseMismatches(d)
  INTEGRITY_SUMMARY = summary()
}

/** Recompute the summary after the live field count is known (FIELDS was swapped). */
export function refreshIntegritySummary(): void {
  INTEGRITY_SUMMARY = summary()
}
