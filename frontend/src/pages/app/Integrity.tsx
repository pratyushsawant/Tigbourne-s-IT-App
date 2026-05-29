import { AUDIT, INTEGRITY_SUMMARY, MISMATCHES, paCoverage } from '../../lib/integrity'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { IShield } from '../../components/icons'

function sev(pct: number) {
  if (pct >= 100) return { c: 'bg-rose-50 text-rose-700', label: 'Severe' }
  if (pct >= 25) return { c: 'bg-amber-50 text-amber-700', label: 'Review' }
  return { c: 'bg-emerald-50 text-emerald-700', label: 'Minor' }
}

/** Compact percent: 4900% stays 4,900%, small values keep a digit. */
function pct(n: number): string {
  return `${Math.round(n).toLocaleString()}%`
}

export default function Integrity() {
  useDocumentTitle('Data Integrity')
  const pa = paCoverage()
  const kpis = [
    { v: INTEGRITY_SUMMARY.validated.toLocaleString(), l: 'Records validated', tone: 'ink' },
    { v: INTEGRITY_SUMMARY.flagged.toString(), l: 'Anomalies flagged', tone: 'amber' },
    { v: INTEGRITY_SUMMARY.severe.toString(), l: 'Severe (≥100% diff)', tone: 'rose' },
    { v: `${pa.pct}%`, l: 'P&A coverage', tone: 'gold' },
  ]
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-600 ring-1 ring-gold-200/60">
          <IShield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Data Integrity</h1>
          <p className="text-sm text-ink-muted">
            Every record is validated on import. Anomalies are flagged visibly — never silently dropped — and every
            correction is logged for full provenance.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-card">
            <p
              className={`text-3xl font-semibold tracking-tight ${
                k.tone === 'rose' ? 'text-rose-600' : k.tone === 'amber' ? 'text-amber-600' : k.tone === 'gold' ? 'text-gold-600' : 'text-ink'
              }`}
            >
              {k.v}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-faint">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Mismatches */}
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-card">
          <div className="border-b border-black/[0.06] px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Production mismatches</h2>
            <p className="text-xs text-ink-faint">
              Fields where reported oil/day diverges from wells × barrels-per-well (E×F). Sorted by severity.
            </p>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#f7f7f8]">
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="px-4 py-3 font-semibold">Region</th>
                  <th className="px-4 py-3 text-right font-semibold">Reported</th>
                  <th className="px-4 py-3 text-right font-semibold">Expected</th>
                  <th className="px-4 py-3 text-right font-semibold">Diff vs E×F</th>
                </tr>
              </thead>
              <tbody>
                {MISMATCHES.map((m, i) => {
                  const s = sev(m.diffPct)
                  return (
                    <tr key={i} className={`border-b border-black/[0.04] ${i % 2 ? 'bg-[#fcfcfd]' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-ink">
                        {m.field}
                        <span className="block text-[11px] font-normal text-ink-faint">{m.country}</span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{m.sheet}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{m.reported.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{m.expected.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.c}`}>
                          {pct(m.diffPct)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit log */}
        <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Audit log</h2>
          <p className="text-xs text-ink-faint">Every transformation applied to the source data, with rationale.</p>
          <ol className="mt-4 space-y-4">
            {AUDIT.map((a, i) => (
              <li key={i} className="relative border-l-2 border-gold-200 pl-4">
                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-gold-500" />
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-gold-50 px-2 py-0.5 text-[10px] font-semibold text-gold-700">{a.type}</span>
                  <span className="text-[11px] text-ink-faint">{a.sheet}</span>
                  <span className="text-[11px] text-ink-faint">· {a.date}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-ink">{a.what}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{a.why}</p>
                {a.range && <p className="mt-1 font-mono text-[10px] text-ink-faint">{a.range}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
