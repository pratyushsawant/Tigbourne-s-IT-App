import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FIELDS, REGIONS, fmt, COL_BY_KEY } from '../../lib/fields'
import { quickUplift, suitabilityFactor, usdCompact } from '../../lib/economics'
import { useAuth } from '../../context/AuthContext'
import { usePrices } from '../../lib/prices'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { IArrow, IBolt, IDrop, IGlobe, ILayers } from '../../components/icons'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const nav = useNavigate()
  const prices = usePrices()

  const totalOil = useMemo(() => FIELDS.reduce((s, f) => s + (f.oilBblPerDay || 0), 0), [])
  const sweet = useMemo(
    () => FIELDS.filter((f) => f.api != null && f.bht != null && f.api >= 16 && f.api <= 40 && f.bht < 130).length,
    [],
  )
  const offshorePct = useMemo(
    () => Math.round((FIELDS.filter((f) => f.shore === 'Offshore').length / FIELDS.length) * 100),
    [],
  )

  const opportunities = useMemo(
    () =>
      FIELDS.map((f) => ({ f, uplift: quickUplift(f), fit: suitabilityFactor(f) }))
        .filter((o) => o.uplift > 0 && Number.isFinite(o.uplift))
        .sort((a, b) => b.uplift - a.uplift)
        .slice(0, 7),
    [],
  )

  const regionCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of FIELDS) m.set(f.region, (m.get(f.region) || 0) + 1)
    const max = Math.max(...m.values())
    return REGIONS.map((r) => ({ region: r, count: m.get(r) || 0, pct: ((m.get(r) || 0) / max) * 100 })).sort(
      (a, b) => b.count - a.count,
    )
  }, [])

  const kpis = [
    { icon: IGlobe, label: 'Fields tracked', value: FIELDS.length.toLocaleString(), sub: `${REGIONS.length} regions` },
    { icon: IDrop, label: 'Oil production tracked', value: `${(totalOil / 1e6).toFixed(1)}M`, sub: 'bbl / day' },
    { icon: IBolt, label: 'In chemical sweet spot', value: sweet.toLocaleString(), sub: `${Math.round((sweet / FIELDS.length) * 100)}% of dataset` },
    { icon: ILayers, label: 'Offshore', value: `${offshorePct}%`, sub: 'of all fields' },
  ]

  const wcCol = COL_BY_KEY['waterCut']

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-6">
      {/* Greeting + market prices */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {greeting()}, {user?.name?.split(' ')[0] || 'there'}.
          </h1>
          <p className="text-sm text-ink-muted">
            {user?.org} ·{' '}
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2.5">
            {prices.quotes.map((p) => {
              const up = p.change >= 0
              return (
                <div key={p.symbol} className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-2 shadow-card">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{p.label}</span>
                    {p.change !== 0 && (
                      <span className={`text-[11px] font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {up ? '▲' : '▼'} {Math.abs(p.change).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-semibold tabular-nums text-ink">${p.price.toFixed(2)}</div>
                </div>
              )
            })}
          </div>
          <span className="flex items-center gap-1.5 pr-1 text-[10px] font-medium text-ink-faint">
            <span className={`h-1.5 w-1.5 rounded-full ${prices.live ? 'bg-emerald-500' : 'bg-ink-faint/50'}`} />
            {prices.live ? `Live · ${prices.asOf}` : 'Reference prices'}
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-5 shadow-card">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold-50" />
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-50 text-gold-600 ring-1 ring-gold-200/60">
                <k.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{k.value}</p>
              <p className="text-xs font-medium text-ink-soft">{k.label}</p>
              <p className="text-[11px] text-ink-faint">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Top CEOR opportunities */}
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Top CEOR opportunities</h2>
              <p className="text-xs text-ink-faint">Fields ranked by modelled chemical-recovery NPV uplift</p>
            </div>
            <Link to="/app/explorer" className="inline-flex items-center gap-1 text-xs font-semibold text-gold-600 hover:text-gold-700">
              View all <IArrow className="h-3.5 w-3.5" />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-faint">
                <th className="px-6 py-2.5 font-medium">Field</th>
                <th className="px-3 py-2.5 font-medium">Country</th>
                <th className="px-3 py-2.5 text-right font-medium">W-Cut</th>
                <th className="px-3 py-2.5 text-right font-medium">Fit</th>
                <th className="px-6 py-2.5 text-right font-medium">NPV uplift</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map(({ f, uplift, fit }) => (
                <tr
                  key={f.id}
                  onClick={() => nav(`/app/field/${f.id}`)}
                  className="cursor-pointer border-t border-black/[0.04] transition hover:bg-gold-50/60"
                >
                  <td className="max-w-[200px] truncate px-6 py-3 font-medium text-ink" title={f.oilfield}>{f.oilfield}</td>
                  <td className="px-3 py-3 text-ink-muted">{f.country}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{fmt(wcCol, f.waterCut)}%</td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-black/[0.06]">
                        <span className="block h-full rounded-full bg-gold-500" style={{ width: `${Math.round(fit * 100)}%` }} />
                      </span>
                      <span className="w-7 text-[11px] tabular-nums text-ink-faint">{Math.round(fit * 100)}%</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-semibold tabular-nums text-emerald-600">+{usdCompact(uplift)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Regional coverage + quick action */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold text-ink">Regional coverage</h2>
            <div className="mt-4 space-y-3">
              {regionCounts.map((r) => (
                <div key={r.region}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-soft">{r.region}</span>
                    <span className="tabular-nums text-ink-faint">{r.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-600" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white shadow-card">
            <div className="absolute inset-0 glow-gold opacity-70" />
            <div className="relative">
              <h2 className="text-lg font-semibold">Screen the full dataset</h2>
              <p className="mt-1.5 text-sm text-white/70">
                Filter {FIELDS.length.toLocaleString()} fields by water cut, API, temperature and cost — then export.
              </p>
              <Link to="/app/explorer" className="btn-gold mt-5 !py-2.5">
                Open Field Explorer
                <IArrow className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
