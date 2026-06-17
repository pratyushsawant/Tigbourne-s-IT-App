import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  COLUMNS,
  FIELDS,
  RANGES,
  REGIONS,
  SHORES,
  fmt,
  type ColumnDef,
  type OilField,
} from '../../lib/fields'
import { exportCSV, exportDOCX, exportPDF } from '../../lib/export'
import { RangeSlider } from '../../components/RangeSlider'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { IExport, IFilter, ILock, ISearch, ISort } from '../../components/icons'

const GRID_COLS = COLUMNS.filter((c) => c.grid)
const RANGE_FILTERS = COLUMNS.filter((c) => c.filterable && c.numeric)
const MAX_RENDER = 250

type Ranges = Record<string, [number, number]>

function initialRanges(): Ranges {
  return Object.fromEntries(
    RANGE_FILTERS.map((c) => [c.key, [...(RANGES[c.key] ?? [0, 0])] as [number, number]]),
  )
}

const usdShort = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)

export default function Explorer() {
  useDocumentTitle('Field Explorer')
  const nav = useNavigate()
  const { can } = useAuth()
  const canExport = can('export')
  const [query, setQuery] = useState('')
  const [regions, setRegions] = useState<string[]>([])
  const [shore, setShore] = useState<string[]>([])
  const [ranges, setRanges] = useState<Ranges>(initialRanges)
  const [activeRanges, setActiveRanges] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<keyof OilField>('oilBblPerDay')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [exportOpen, setExportOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = FIELDS.filter((f) => {
      if (q && !`${f.oilfield} ${f.operator} ${f.country}`.toLowerCase().includes(q)) return false
      if (regions.length && !regions.includes(f.region)) return false
      if (shore.length && !shore.includes(f.shore)) return false
      for (const c of RANGE_FILTERS) {
        if (!activeRanges[c.key]) continue
        const [lo, hi] = ranges[c.key]
        const v = f[c.key]
        if (typeof v !== 'number' || Number.isNaN(v)) return false
        if (v < lo || v > hi) return false
      }
      return true
    })
    rows = rows.slice().sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return rows
  }, [query, regions, shore, ranges, activeRanges, sortKey, sortDir])

  const activeCount =
    (query ? 1 : 0) + regions.length + shore.length + Object.values(activeRanges).filter(Boolean).length

  function setSort(key: keyof OilField) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function resetAll() {
    setQuery('')
    setRegions([])
    setShore([])
    setRanges(initialRanges())
    setActiveRanges({})
  }

  function rangeFormat(c: ColumnDef) {
    return (n: number) =>
      c.key === 'drillCost' || c.key === 'pa' ? usdShort(n) : c.unit === '%' ? `${Math.round(n)}%` : Math.round(n).toLocaleString()
  }

  const stats = useMemo(() => {
    let oil = 0
    let wcSum = 0
    let wcN = 0
    let sweet = 0
    let offshore = 0
    for (const f of filtered) {
      oil += f.oilBblPerDay || 0
      if (f.waterCut != null) {
        wcSum += f.waterCut
        wcN++
      }
      if (f.api != null && f.bht != null && f.api >= 16 && f.api <= 40 && f.bht < 130) sweet++
      if (f.shore === 'Offshore') offshore++
    }
    return {
      oil,
      avgWc: wcN ? Math.round(wcSum / wcN) : 0,
      sweet,
      offshore,
    }
  }, [filtered])

  const kpis = [
    { label: 'Matching fields', value: filtered.length.toLocaleString(), tone: 'ink' as const },
    { label: 'Oil production', value: `${(stats.oil / 1e6).toFixed(2)}M`, unit: 'bbl/d', tone: 'gold' as const },
    { label: 'Avg water cut', value: `${stats.avgWc}`, unit: '%', tone: 'ink' as const },
    { label: 'In sweet spot', value: stats.sweet.toLocaleString(), unit: `of ${filtered.length.toLocaleString()}`, tone: 'pos' as const },
  ]

  const filterInner = (
    <>
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <IFilter className="h-4 w-4 text-gold-600" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-white">{activeCount}</span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={resetAll} className="text-xs font-medium text-gold-600 hover:text-gold-700">
            Reset
          </button>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Region
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => toggle(regions, r, setRegions)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    regions.includes(r)
                      ? 'bg-ink text-white'
                      : 'bg-black/[0.04] text-ink-soft hover:bg-black/[0.07]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Location
            </label>
            <div className="flex gap-1.5">
              {SHORES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggle(shore, s, setShore)}
                  className={`flex-1 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                    shore.includes(s) ? 'bg-gold-500 text-white' : 'bg-black/[0.04] text-ink-soft hover:bg-black/[0.07]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5 border-t border-black/[0.06] pt-5">
            {RANGE_FILTERS.map((c) => {
              const [rmin, rmax] = RANGES[c.key]
              const on = !!activeRanges[c.key]
              return (
                <div key={c.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-soft">
                      {c.label}
                      {c.unit && <span className="ml-1 font-normal text-ink-faint">({c.unit})</span>}
                    </span>
                    <button
                      onClick={() => setActiveRanges((a) => ({ ...a, [c.key]: !on }))}
                      className={`relative h-4 w-7 rounded-full transition ${on ? 'bg-gold-500' : 'bg-black/[0.12]'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
                          on ? 'left-3.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <div className={on ? '' : 'pointer-events-none opacity-40'}>
                    <RangeSlider
                      min={rmin}
                      max={rmax}
                      step={Math.max((rmax - rmin) / 100, c.unit === '%' ? 1 : 0.1)}
                      value={ranges[c.key]}
                      onChange={(v) => {
                        setRanges((r) => ({ ...r, [c.key]: v }))
                        if (!on) setActiveRanges((a) => ({ ...a, [c.key]: true }))
                      }}
                      format={rangeFormat(c)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
      </div>
    </>
  )

  return (
    <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-6 py-6">
      {/* Filter rail (desktop) */}
      <aside className="sticky top-[88px] hidden h-[calc(100vh-112px)] w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-card lg:flex">
        {filterInner}
      </aside>
      {/* Filter slide-over (mobile) */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setFiltersOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-80 max-w-[85%] flex-col bg-white shadow-float animate-fade-up">
            {filterInner}
            <div className="border-t border-black/[0.06] p-4">
              <button onClick={() => setFiltersOpen(false)} className="btn-dark w-full !py-2.5">
                Show {filtered.length.toLocaleString()} results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <section className="min-w-0 flex-1">
        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Field Explorer</h1>
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-ink">{filtered.length.toLocaleString()}</span> of{' '}
              {FIELDS.length.toLocaleString()} fields match
              {filtered.length > MAX_RENDER && (
                <span className="text-ink-faint"> · showing first {MAX_RENDER}, export includes all</span>
              )}
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-gold-300 lg:hidden"
            >
              <IFilter className="h-4 w-4 text-gold-600" />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-white">{activeCount}</span>
              )}
            </button>
            <div className="relative">
              <ISearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search field, operator, country…"
                className="w-64 rounded-full border border-black/10 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="btn-dark !px-4 !py-2.5"
                title={canExport ? undefined : 'Export is available on Institutional & Enterprise tiers'}
              >
                {canExport ? <IExport className="h-4 w-4" /> : <ILock className="h-4 w-4" />}
                Export
              </button>
              {exportOpen && !canExport && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-black/[0.07] bg-white p-4 shadow-float animate-fade-up">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <ILock className="h-4 w-4 text-gold-600" />
                      Upgrade to export
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                      CSV, PDF and Word export are included with the Institutional and Enterprise tiers. Your plan is
                      view-only.
                    </p>
                    <button
                      onClick={() => {
                        setExportOpen(false)
                        nav('/pricing')
                      }}
                      className="btn-dark mt-3 w-full !py-2 text-xs"
                    >
                      View plans
                    </button>
                  </div>
                </>
              )}
              {exportOpen && canExport && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-black/[0.07] bg-white shadow-float animate-fade-up">
                    <p className="border-b border-black/[0.06] px-4 py-2.5 text-[11px] font-medium text-ink-faint">
                      Export {filtered.length.toLocaleString()} fields
                    </p>
                    {[
                      { l: 'CSV spreadsheet', s: '.csv', fn: () => exportCSV(filtered, GRID_COLS) },
                      { l: 'PDF document', s: '.pdf', fn: () => exportPDF(filtered, GRID_COLS) },
                      { l: 'Word document', s: '.doc', fn: () => exportDOCX(filtered, GRID_COLS) },
                    ].map((o) => (
                      <button
                        key={o.s}
                        onClick={() => {
                          o.fn()
                          setExportOpen(false)
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-gold-50 hover:text-ink"
                      >
                        {o.l}
                        <span className="text-[11px] text-ink-faint">{o.s}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI strip — summarises the current filtered set */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-black/[0.06] bg-white px-4 py-3 shadow-card">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{k.label}</p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">
                <span className={k.tone === 'gold' ? 'text-gold-600' : k.tone === 'pos' ? 'text-emerald-600' : 'text-ink'}>
                  {k.value}
                </span>
                {k.unit && <span className="ml-1 text-xs font-normal text-ink-faint">{k.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-card">
          <div className="max-h-[calc(100vh-220px)] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f7f7f8] text-left">
                  {GRID_COLS.map((c) => (
                    <th
                      key={c.key}
                      onClick={() => setSort(c.key)}
                      className={`cursor-pointer whitespace-nowrap border-b border-black/[0.07] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted transition hover:text-ink ${
                        c.numeric ? 'text-right' : ''
                      }`}
                    >
                      <span className={`inline-flex items-center gap-1 ${c.numeric ? 'flex-row-reverse' : ''}`}>
                        {c.short}
                        {sortKey === c.key ? (
                          <span className="text-gold-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        ) : (
                          <ISort className="h-3 w-3 text-ink-faint/40" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, MAX_RENDER).map((f, i) => (
                  <tr
                    key={f.id}
                    onClick={() => nav(`/app/field/${f.id}`)}
                    className={`cursor-pointer border-b border-black/[0.04] transition hover:bg-gold-50/60 ${
                      i % 2 ? 'bg-[#fcfcfd]' : ''
                    }`}
                  >
                    {GRID_COLS.map((c) => (
                      <td
                        key={c.key}
                        title={!c.numeric ? String(f[c.key] ?? '') : undefined}
                        className={`px-4 py-3 ${
                          c.numeric ? 'whitespace-nowrap text-right tabular-nums text-ink-soft' : 'text-ink'
                        } ${c.key === 'oilfield' ? 'max-w-[240px] truncate font-medium' : ''} ${
                          c.key === 'operator' ? 'max-w-[170px] truncate' : ''
                        } ${c.key === 'country' ? 'max-w-[120px] truncate' : ''} ${
                          c.key === 'region' ? 'whitespace-nowrap' : ''
                        }`}
                      >
                        {c.key === 'shore' ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              f.shore === 'Offshore'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {f.shore}
                          </span>
                        ) : c.key === 'waterCut' && f.waterCut != null ? (
                          <span className="inline-flex items-center justify-end gap-2">
                            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-black/[0.06]">
                              <span
                                className={`block h-full rounded-full ${
                                  f.waterCut < 40 ? 'bg-emerald-500' : f.waterCut < 70 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, f.waterCut)}%` }}
                              />
                            </span>
                            <span className="w-8 text-ink-soft">{f.waterCut}%</span>
                          </span>
                        ) : c.key === 'api' && f.api != null ? (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                              f.api >= 16 && f.api <= 40 ? 'bg-gold-50 text-gold-700' : 'text-ink-soft'
                            }`}
                            title={f.api >= 16 && f.api <= 40 ? 'Within chemical-recovery sweet spot (16–40°)' : undefined}
                          >
                            {f.api}
                          </span>
                        ) : (
                          fmt(c, f[c.key])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={GRID_COLS.length} className="px-4 py-20 text-center">
                      <p className="text-sm font-medium text-ink">No fields match these filters.</p>
                      <button onClick={resetAll} className="mt-2 text-sm font-semibold text-gold-600 hover:text-gold-700">
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
