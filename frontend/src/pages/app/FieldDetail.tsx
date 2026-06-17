import { Link, useNavigate, useParams } from 'react-router-dom'
import { COLUMNS, FIELDS, fmt, type ColumnDef } from '../../lib/fields'
import { exportCSV } from '../../lib/export'
import { Economics } from '../../components/Economics'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { IArrow, ICheck, IClose, IExport, ILock } from '../../components/icons'

const GROUP_ORDER = ['Production', 'Reservoir', 'Location', 'Cost'] as const

function suitability(api: number | null, bht: number | null, waterCut: number | null) {
  const notes: { ok: boolean; text: string }[] = []
  if (api != null) notes.push({ ok: api >= 16 && api <= 40, text: `API ${api}° ${api >= 16 && api <= 40 ? 'in 16–40° sweet spot' : 'outside chemical sweet spot'}` })
  if (bht != null) notes.push({ ok: bht < 130, text: `${bht}°C ${bht < 130 ? 'below 130°C threshold' : 'too hot — chemicals degrade'}` })
  if (waterCut != null) notes.push({ ok: waterCut <= 40, text: `${waterCut}% water cut ${waterCut <= 40 ? '— early-intervention window open' : '— late stage, value largely lost'}` })
  const score = notes.filter((n) => n.ok).length
  return { notes, score, total: notes.length }
}

export default function FieldDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { can } = useAuth()
  const field = FIELDS.find((f) => f.id === Number(id))
  useDocumentTitle(field ? field.oilfield : 'Field')

  if (!field) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-lg font-semibold text-ink">Field not found.</p>
        <Link to="/app" className="mt-3 inline-block text-sm font-semibold text-gold-600">
          Back to Explorer
        </Link>
      </div>
    )
  }

  const suit = suitability(field.api, field.bht, field.waterCut)
  const headline: { col: ColumnDef; }[] = (['oilBblPerDay', 'waterCut', 'api', 'liftCost'] as const).map((k) => ({
    col: COLUMNS.find((c) => c.key === k)!,
  }))

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-6">
      <button
        onClick={() => nav(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <IArrow className="h-4 w-4 rotate-180" />
        Back to Explorer
      </button>

      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-card">
        <div className="relative border-b border-black/[0.06] bg-ink p-7 text-white">
          <div className="absolute inset-0 glow-gold opacity-70" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-gold-400">
                <span>{field.region}</span>
                <span className="text-white/30">·</span>
                <span>{field.country}</span>
              </div>
              <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">{field.oilfield}</h1>
              <p className="mt-1 text-sm text-white/70">Operated by {field.operator}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  field.shore === 'Offshore' ? 'bg-blue-500/20 text-blue-200' : 'bg-emerald-500/20 text-emerald-200'
                }`}
              >
                {field.shore}
              </span>
              {can('export') && (
                <button
                  onClick={() => exportCSV([field], COLUMNS)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <IExport className="h-3.5 w-3.5" />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Headline metrics */}
        <div className="grid grid-cols-2 gap-px bg-black/[0.06] sm:grid-cols-4">
          {headline.map(({ col }) => (
            <div key={col.key} className="bg-white p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{col.label}</p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
                {fmt(col, field[col.key])}
                {col.unit && <span className="ml-1 text-sm font-normal text-ink-faint">{col.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Parameter groups */}
        <div className="space-y-6">
          {GROUP_ORDER.map((group) => {
            const cols = COLUMNS.filter((c) => c.group === group && c.numeric)
            return (
              <div key={group} className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-600">{group}</h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {cols.map((c) => (
                    <div key={c.key}>
                      <dt className="text-xs text-ink-faint">
                        {c.label}
                        {c.unit && <span className="ml-1">({c.unit})</span>}
                      </dt>
                      <dd className="mt-0.5 text-base font-semibold tabular-nums text-ink">{fmt(c, field[c.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          })}
        </div>

        {/* Recovery suitability */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-600">
              Chemical recovery fit
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eee" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#c8922f"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(suit.score / Math.max(suit.total, 1)) * 97.4} 100`}
                  />
                </svg>
                <span className="absolute text-sm font-bold text-ink">
                  {suit.score}/{suit.total}
                </span>
              </div>
              <p className="flex-1 text-xs text-ink-muted">
                Screening signals favourable to a chemical-recovery intervention on this field.
              </p>
            </div>
            <ul className="mt-4 space-y-2.5">
              {suit.notes.map((n) => (
                <li key={n.text} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      n.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    {n.ok ? <ICheck className="h-2.5 w-2.5" /> : <IClose className="h-2.5 w-2.5" />}
                  </span>
                  <span className="text-ink-soft">{n.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-black/[0.06] pt-3 text-[11px] leading-relaxed text-ink-faint">
              Screening heuristic only — full CEOR vs. drilling NPV is computed in the economics engine (post-MVP).
            </p>
          </div>
        </aside>
      </div>

      {/* Field economics — NPV with/without CEOR & break-even */}
      <div className="mt-6">
        {can('economics') ? (
          <Economics field={field} />
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-gold-200/70 bg-gold-50/40 p-10 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gold-600 shadow-card ring-1 ring-gold-200/60">
              <ILock className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink">Economics is an Institutional feature</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              NPV with vs. without CEOR, break-even oil price, the water-cut intervention curve and CEOR-vs-drilling
              comparison are included with the Institutional and Enterprise tiers. Your plan is view-only.
            </p>
            <Link to="/pricing" className="btn-dark mt-5 !py-2.5">
              View plans
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
