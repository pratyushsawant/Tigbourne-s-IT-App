import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ASSUMPTIONS, fieldEconomics, SCENARIO_RANGES, usdAxis, usdCompact, type Scenario } from '../lib/economics'
import { brentPrice, usePrices } from '../lib/prices'
import type { OilField } from '../lib/fields'

const tip = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    fontSize: 12,
    padding: '8px 12px',
  },
}

const GOLD = '#c8922f'
const INK = '#1a1a1a'

/**
 * Y-axis scale with ~12% headroom (so curves never touch the edges) snapped to nice
 * round bounds + ticks (so labels read $50B / $100B, not $897M / -$82M).
 */
function niceScale(vals: number[]): { domain: [number, number]; ticks: number[] } {
  if (!vals.length) return { domain: [0, 1], ticks: [0, 1] }
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (min === max) {
    min -= 1
    max += 1
  }
  const pad = (max - min) * 0.12
  let lo = min - pad
  let hi = max + pad
  const rough = (hi - lo) / 4 || 1
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t)
  return { domain: [lo, hi], ticks }
}

const DEFAULT_SCENARIO: Required<Scenario> = {
  price: ASSUMPTIONS.basePrice,
  discountRate: ASSUMPTIONS.discountRate,
  chemPerBblWater: ASSUMPTIONS.chemPerBblWater,
  years: ASSUMPTIONS.years,
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'gold' | 'pos' | 'neg' }) {
  const color =
    accent === 'gold' ? 'text-gold-600' : accent === 'pos' ? 'text-emerald-600' : accent === 'neg' ? 'text-rose-600' : 'text-ink'
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function ScenarioSlider({
  k,
  value,
  onChange,
}: {
  k: keyof typeof SCENARIO_RANGES
  value: number
  onChange: (v: number) => void
}) {
  const r = SCENARIO_RANGES[k]
  const pct = ((value - r.min) / (r.max - r.min)) * 100
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-soft">{r.label}</span>
        <span className="text-xs font-semibold tabular-nums text-gold-700">{r.fmt(value)}</span>
      </div>
      <input
        type="range"
        min={r.min}
        max={r.max}
        step={r.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-gold-500"
        style={{ background: `linear-gradient(to right, ${GOLD} ${pct}%, rgba(0,0,0,0.08) ${pct}%)` }}
      />
    </div>
  )
}

export function Economics({ field }: { field: OilField }) {
  const prices = usePrices()
  const [scenario, setScenario] = useState<Required<Scenario>>(() => ({ ...DEFAULT_SCENARIO, price: Math.round(brentPrice()) }))
  const [priceTouched, setPriceTouched] = useState(false)
  const eco = useMemo(() => fieldEconomics(field, scenario), [field, scenario])

  // Default the scenario oil price to live Brent once the feed responds (unless the analyst overrode it).
  useEffect(() => {
    if (prices.live && !priceTouched) setScenario((s) => ({ ...s, price: Math.round(brentPrice(prices)) }))
  }, [prices.live, priceTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof Scenario) => (v: number) => {
    if (k === 'price') setPriceTouched(true)
    setScenario((s) => ({ ...s, [k]: v }))
  }
  const resetScenario = () => {
    setPriceTouched(false)
    setScenario({ ...DEFAULT_SCENARIO, price: Math.round(brentPrice(prices)) })
  }
  const dirty =
    priceTouched ||
    (['discountRate', 'chemPerBblWater', 'years'] as (keyof Scenario)[]).some((k) => scenario[k] !== DEFAULT_SCENARIO[k])

  if (!eco.ok) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-600">Field economics</h2>
        <p className="mt-3 text-sm text-ink-muted">{eco.reason}</p>
      </div>
    )
  }

  const upliftPos = eco.uplift >= 0

  // Nice Y-axis scales with headroom so the lines/areas aren't clipped at the chart edges.
  const npvScale = niceScale(eco.series.flatMap((p) => [p.baseCum, p.ceorCum]))
  const beScale = niceScale(eco.sweep.flatMap((p) => [p.base, p.ceor]))
  const ivScale = niceScale(eco.intervention.map((p) => p.npv))

  // When a break-even has no zero-crossing in the $10–130 sweep, say which side.
  const beLabel = (be: number | null, key: 'base' | 'ceor') => {
    if (be != null) return `$${be}/bbl`
    const lowest = eco.sweep[0]?.[key] ?? 0
    return lowest > 0 ? '< $10/bbl' : '> $130/bbl'
  }

  return (
    <div className="space-y-6">
      {/* Scenario controls */}
      <div className="rounded-2xl border border-gold-200/70 bg-gold-50/40 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-700">Scenario inputs</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
              Adjust the assumptions — everything below updates live.
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  prices.live ? 'bg-emerald-100 text-emerald-700' : 'bg-black/[0.05] text-ink-muted'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${prices.live ? 'bg-emerald-500' : 'bg-ink-faint'}`} />
                Brent ${brentPrice(prices)} · {prices.live ? 'live' : 'reference'}
              </span>
            </p>
          </div>
          {dirty && (
            <button
              onClick={resetScenario}
              className="rounded-full border border-gold-300 bg-white px-3 py-1.5 text-xs font-semibold text-gold-700 transition hover:bg-gold-50"
            >
              Reset to defaults
            </button>
          )}
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <ScenarioSlider k="price" value={scenario.price} onChange={set('price')} />
          <ScenarioSlider k="discountRate" value={scenario.discountRate} onChange={set('discountRate')} />
          <ScenarioSlider k="chemPerBblWater" value={scenario.chemPerBblWater} onChange={set('chemPerBblWater')} />
          <ScenarioSlider k="years" value={scenario.years} onChange={set('years')} />
        </div>
      </div>

      {/* Headline economics */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-600">Field economics</h2>
          <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-ink-muted">
            DCF · {scenario.years}yr · {(scenario.discountRate * 100).toFixed(1)}% discount · ${scenario.price}/bbl
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="NPV — no CEOR" value={usdCompact(eco.npvBase)} />
          <Stat label="NPV — with CEOR" value={usdCompact(eco.npvCeor)} accent="gold" />
          <Stat label="CEOR uplift" value={`${upliftPos ? '+' : ''}${usdCompact(eco.uplift)}`} accent={upliftPos ? 'pos' : 'neg'} />
          <Stat label="Recovery fit" value={`${Math.round(eco.suitability * 100)}%`} />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-faint">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400" />
          NPV is net of {usdCompact(eco.paCost)} end-of-life plug &amp; abandonment
          <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${eco.paEstimated ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {eco.paEstimated ? 'estimated' : 'from dataset'}
          </span>
          — a differentiator most valuations omit.
        </p>
      </div>

      {/* NPV with vs without CEOR */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <h3 className="text-sm font-semibold text-ink">NPV — with vs without CEOR</h3>
        <p className="mt-0.5 text-xs text-ink-faint">
          Cumulative discounted cash flow at ${scenario.price}/bbl. CEOR starts negative (program capex of{' '}
          {usdCompact(eco.capex)}) then{' '}
          {upliftPos ? 'overtakes the base case as enhanced recovery pays back.' : 'fails to pay back — this field is a poor CEOR candidate.'}
        </p>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={eco.series} margin={{ left: 4, right: 8, top: 18, bottom: 12 }}>
              <defs>
                <linearGradient id="ceorFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis
                dataKey="year"
                height={44}
                tick={{ fontSize: 11, fill: '#8e8e93' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Year', position: 'insideBottom', offset: 0, fontSize: 11, fill: '#8e8e93' }}
              />
              <YAxis
                domain={npvScale.domain}
                ticks={npvScale.ticks}
                tick={{ fontSize: 11, fill: '#8e8e93' }}
                axisLine={false}
                tickLine={false}
                width={70}
                tickFormatter={(v) => usdAxis(v)}
              />
              <Tooltip {...tip} formatter={(v: number, n) => [usdCompact(v), n === 'ceorCum' ? 'With CEOR' : 'Without CEOR']} labelFormatter={(l) => `Year ${l}`} />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.25)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="ceorCum" stroke="none" fill="url(#ceorFill)" />
              <Line type="monotone" dataKey="baseCum" name="Without CEOR" stroke={INK} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ceorCum" name="With CEOR" stroke={GOLD} strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <Legend
          items={[
            { c: INK, t: 'Without CEOR (business-as-usual decline)' },
            { c: GOLD, t: 'With CEOR (chemical-enhanced recovery)' },
          ]}
        />
      </div>

      {/* Break-even */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <h3 className="text-sm font-semibold text-ink">Break-even oil price</h3>
        <p className="mt-0.5 text-xs text-ink-faint">
          Where each curve crosses zero is the oil price below which the field stops making money (shutdown). The dashed
          line marks your scenario price of ${scenario.price}/bbl.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Stat label="Break-even — no CEOR" value={beLabel(eco.breakEvenBase, 'base')} />
          <Stat label="Break-even — with CEOR" value={beLabel(eco.breakEvenCeor, 'ceor')} accent="gold" />
          {eco.crossover != null && <Stat label="CEOR wins above" value={`$${eco.crossover}/bbl`} accent="pos" />}
        </div>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={eco.sweep} margin={{ left: 4, right: 8, top: 18, bottom: 12 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis
                dataKey="price"
                type="number"
                height={44}
                domain={[10, 130]}
                ticks={[10, 30, 50, 70, 90, 110, 130]}
                tick={{ fontSize: 11, fill: '#8e8e93' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
                label={{ value: 'Oil price ($/bbl)', position: 'insideBottom', offset: 0, fontSize: 11, fill: '#8e8e93' }}
              />
              <YAxis
                domain={beScale.domain}
                ticks={beScale.ticks}
                tick={{ fontSize: 11, fill: '#8e8e93' }}
                axisLine={false}
                tickLine={false}
                width={70}
                tickFormatter={(v) => usdAxis(v)}
              />
              <Tooltip {...tip} formatter={(v: number, n) => [usdCompact(v), n === 'ceor' ? 'With CEOR' : 'Without CEOR']} labelFormatter={(l) => `$${l}/bbl`} />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.35)" />
              <ReferenceLine x={scenario.price} stroke="#b07523" strokeDasharray="4 4" label={{ value: 'Scenario', fontSize: 10, fill: '#b07523', position: 'insideTopRight', offset: 6 }} />
              <Line type="monotone" dataKey="base" name="Without CEOR" stroke={INK} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ceor" name="With CEOR" stroke={GOLD} strokeWidth={2.5} dot={false} />
              {eco.breakEvenBase != null && <ReferenceDot x={eco.breakEvenBase} y={0} r={4} fill={INK} stroke="#fff" strokeWidth={1.5} />}
              {eco.breakEvenCeor != null && <ReferenceDot x={eco.breakEvenCeor} y={0} r={4} fill={GOLD} stroke="#fff" strokeWidth={1.5} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <Legend
          items={[
            { c: INK, t: 'Without CEOR' },
            { c: GOLD, t: 'With CEOR' },
          ]}
        />
      </div>

      {/* Water-cut intervention curve */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <h3 className="text-sm font-semibold text-ink">Value of early intervention</h3>
        <p className="mt-0.5 text-xs text-ink-faint">
          Incremental NPV from starting CEOR at each water-cut level. Mobile oil left behind by waiting can't be
          recovered — intervening early is worth dramatically more.
        </p>
        {eco.currentWaterCut != null && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Stat label="This field today" value={`${eco.currentWaterCut}% water cut`} />
            {eco.earlyVsLate != null && eco.earlyVsLate > 1 && (
              <Stat label="Value forgone vs. 10% start" value={`≈${eco.earlyVsLate}×`} accent="neg" />
            )}
            <Stat label="Optimal NPV (≤10%)" value={usdCompact(eco.intervention[0]?.npv ?? 0)} accent="gold" />
          </div>
        )}
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={eco.intervention} margin={{ left: 4, right: 8, top: 18, bottom: 12 }}>
              <defs>
                <linearGradient id="wcFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis
                dataKey="waterCut"
                height={44}
                tick={{ fontSize: 11, fill: '#8e8e93' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                label={{ value: 'Water cut at intervention', position: 'insideBottom', offset: 0, fontSize: 11, fill: '#8e8e93' }}
              />
              <YAxis domain={ivScale.domain} ticks={ivScale.ticks} tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => usdAxis(v)} />
              <Tooltip {...tip} formatter={(v: number) => [usdCompact(v), 'Incremental NPV']} labelFormatter={(l) => `Intervene at ${l}% water cut`} cursor={{ fill: 'rgba(212,167,73,0.08)' }} />
              {eco.currentWaterCut != null && (
                <ReferenceLine x={Math.round(eco.currentWaterCut / 10) * 10} stroke="#b07523" strokeDasharray="4 4" label={{ value: 'Today', fontSize: 10, fill: '#b07523', position: 'insideTopRight', offset: 6 }} />
              )}
              <Bar dataKey="npv" radius={[5, 5, 0, 0]}>
                {eco.intervention.map((p) => (
                  <Cell key={p.waterCut} fill={p.waterCut <= 30 ? 'url(#wcFill)' : p.waterCut <= 60 ? '#dfbe6e' : '#ebd8a4'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          Tigbourne's data shows intervening at ~10% water cut is roughly <b className="text-ink-soft">10× more valuable</b> than waiting until ~80% — this chart prices that gap for this field.
        </p>
      </div>

      {/* CEOR vs. drilling */}
      {eco.drillVsCeor && (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">CEOR vs. drilling</h3>
              <p className="mt-0.5 text-xs text-ink-faint">
                Two ways to recover the same{' '}
                <b className="text-ink-soft">~{Math.round(eco.drillVsCeor.incrementalBopd).toLocaleString()} bbl/d</b> of
                incremental oil — apply chemicals, or drill new wells. Which creates more value?
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                eco.drillVsCeor.recommend === 'CEOR'
                  ? 'bg-gold-100 text-gold-700'
                  : eco.drillVsCeor.recommend === 'Drill'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-rose-100 text-rose-700'
              }`}
            >
              {eco.drillVsCeor.recommend === 'Neither' ? 'Neither pays back' : `Recommend: ${eco.drillVsCeor.recommend}`}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* CEOR */}
            <div className={`rounded-2xl border p-5 ${eco.drillVsCeor.recommend === 'CEOR' ? 'border-gold-300 bg-gold-50/50' : 'border-black/[0.06]'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">Apply chemicals (CEOR)</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-ink">{usdCompact(eco.drillVsCeor.ceor.npv)}</p>
              <p className="text-[11px] text-ink-faint">incremental NPV</p>
              <dl className="mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between"><dt className="text-ink-muted">Upfront capex</dt><dd className="font-medium tabular-nums text-ink">{usdCompact(eco.drillVsCeor.ceor.capex)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">Capex / incremental bbl</dt><dd className="font-medium tabular-nums text-ink">${eco.drillVsCeor.ceor.perBbl.toFixed(2)}</dd></div>
              </dl>
            </div>
            {/* Drill */}
            {eco.drillVsCeor.drill ? (
              <div className={`rounded-2xl border p-5 ${eco.drillVsCeor.recommend === 'Drill' ? 'border-blue-300 bg-blue-50/40' : 'border-black/[0.06]'}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Drill new wells</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-ink">{usdCompact(eco.drillVsCeor.drill.npv)}</p>
                <p className="text-[11px] text-ink-faint">incremental NPV</p>
                <dl className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between"><dt className="text-ink-muted">New wells needed</dt><dd className="font-medium tabular-nums text-ink">{eco.drillVsCeor.drill.wells.toLocaleString()}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-muted">Upfront capex</dt><dd className="font-medium tabular-nums text-ink">{usdCompact(eco.drillVsCeor.drill.capex)}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-muted">Capex / incremental bbl</dt><dd className="font-medium tabular-nums text-ink">${eco.drillVsCeor.drill.perBbl.toFixed(2)}</dd></div>
                </dl>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-black/[0.1] p-5 text-center text-xs text-ink-faint">
                Drilling comparison needs barrels-per-well and drill cost — not available for this field.
              </div>
            )}
          </div>
        </div>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-ink-faint">
        Screening estimates only — a transparent DCF over {scenario.years} years at a{' '}
        {(scenario.discountRate * 100).toFixed(1)}% discount rate, ${scenario.chemPerBblWater.toFixed(2)}/bbl-water chemical cost, and
        end-of-life P&amp;A. CEOR uplift is scaled by the field's API gravity, reservoir temperature and water cut. Not
        reserves-grade valuation or investment advice.
      </p>
    </div>
  )
}

function Legend({ items }: { items: { c: string; t: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-5 text-xs text-ink-soft">
      {items.map((i) => (
        <span key={i.t} className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-full" style={{ background: i.c }} />
          {i.t}
        </span>
      ))}
    </div>
  )
}
