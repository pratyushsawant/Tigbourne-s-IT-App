import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ASSUMPTIONS, fieldEconomics, SCENARIO_RANGES, usdAxis, usdCompact, type Scenario } from '../lib/economics'
import { benchmarkPrice, usePrices, type Benchmark } from '../lib/prices'
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
  const [benchmark, setBenchmark] = useState<Benchmark>('BRENT')
  const [scenario, setScenario] = useState<Required<Scenario>>(() => ({ ...DEFAULT_SCENARIO, price: Math.round(benchmarkPrice(undefined, 'BRENT')) }))
  const [priceTouched, setPriceTouched] = useState(false)
  const eco = useMemo(() => fieldEconomics(field, scenario), [field, scenario])

  // Drive the scenario price from the chosen live benchmark (unless the analyst set it by hand).
  useEffect(() => {
    if (!priceTouched) setScenario((s) => ({ ...s, price: Math.round(benchmarkPrice(prices, benchmark)) }))
  }, [prices.live, benchmark, priceTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof Scenario) => (v: number) => {
    if (k === 'price') setPriceTouched(true)
    setScenario((s) => ({ ...s, [k]: v }))
  }
  const resetScenario = () => {
    setPriceTouched(false)
    setScenario({ ...DEFAULT_SCENARIO, price: Math.round(benchmarkPrice(prices, benchmark)) })
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
  const ivScale = niceScale(eco.intervention.map((p) => p.npv))

  return (
    <div className="space-y-6">
      {/* Scenario controls */}
      <div className="rounded-2xl border border-gold-200/70 bg-gold-50/40 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-700">Scenario inputs</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
              Adjust the assumptions — everything below updates live. Benchmark:
              <span className="inline-flex overflow-hidden rounded-full border border-gold-300">
                {(['BRENT', 'WTI', 'DUBAI'] as Benchmark[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setBenchmark(b)
                      setPriceTouched(false)
                    }}
                    className={`px-2 py-0.5 text-[10px] font-semibold transition ${
                      benchmark === b ? 'bg-gold-500 text-white' : 'bg-white text-gold-700 hover:bg-gold-50'
                    }`}
                  >
                    {b === 'DUBAI' ? 'Dubai' : b === 'WTI' ? 'WTI' : 'Brent'}
                  </button>
                ))}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  prices.live ? 'bg-emerald-100 text-emerald-700' : 'bg-black/[0.05] text-ink-muted'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${prices.live ? 'bg-emerald-500' : 'bg-ink-faint'}`} />
                ${Math.round(benchmarkPrice(prices, benchmark))} · {prices.live ? 'live' : 'reference'}
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
              <Tooltip {...tip} formatter={(v: number, n) => [usdCompact(v), String(n)]} labelFormatter={(l) => `Year ${l}`} />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.25)" strokeDasharray="3 3" />
              {/* One series per line (CEOR = filled area with a gold stroke) — avoids a duplicate
                  tooltip entry and labels each by its `name`. */}
              <Area type="monotone" dataKey="ceorCum" name="With CEOR" stroke={GOLD} strokeWidth={2.5} fill="url(#ceorFill)" dot={false} />
              <Line type="monotone" dataKey="baseCum" name="Without CEOR" stroke={INK} strokeWidth={2} dot={false} />
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

      {/* CEOR break-even — water cut */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <h3 className="text-sm font-semibold text-ink">CEOR break-even — water cut</h3>
        <p className="mt-0.5 text-xs text-ink-faint">
          Incremental NPV from starting CEOR at each water-cut level. It falls as water cut rises — less mobile
          oil remains and the chemical cost per barrel climbs. Where it crosses zero is the latest water cut at
          which a CEOR program still pays. The dashed line marks this field today.
        </p>
        {eco.currentWaterCut != null && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Stat label="This field today" value={`${eco.currentWaterCut}% water cut`} />
            <Stat
              label="CEOR break-even"
              value={
                eco.ceorDeadlineWaterCut != null
                  ? `${eco.ceorDeadlineWaterCut}% water cut`
                  : (eco.intervention[0]?.npv ?? 0) <= 0
                    ? 'Uneconomic'
                    : '> 90%'
              }
              accent="gold"
            />
            <Stat label="Optimal NPV (≤10%)" value={usdCompact(eco.intervention[0]?.npv ?? 0)} accent="pos" />
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
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.35)" />
              {eco.ceorDeadlineWaterCut != null && (
                <ReferenceLine
                  x={eco.ceorDeadlineWaterCut}
                  stroke="#e5484d"
                  strokeDasharray="4 4"
                  label={{ value: 'Break-even', fontSize: 10, fill: '#e5484d', position: 'insideTopRight', offset: 6 }}
                />
              )}
              {eco.currentWaterCut != null && (
                <ReferenceLine x={Math.round(eco.currentWaterCut / 10) * 10} stroke="#b07523" strokeDasharray="4 4" label={{ value: 'Today', fontSize: 10, fill: '#b07523', position: 'insideTopLeft', offset: 6 }} />
              )}
              <Bar dataKey="npv" radius={[5, 5, 0, 0]}>
                {eco.intervention.map((p) => (
                  <Cell key={p.waterCut} fill={p.npv < 0 ? '#e7c4b8' : p.waterCut <= 30 ? 'url(#wcFill)' : p.waterCut <= 60 ? '#dfbe6e' : '#ebd8a4'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          Intervening early is worth far more than waiting — each step up in water cut leaves mobile oil behind and
          raises the chemical cost per barrel. Past the break-even water cut, a CEOR program no longer earns its cost
          on this field.
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
              {!eco.drillVsCeor.ceorViable
                ? 'Past CEOR window'
                : eco.drillVsCeor.recommend === 'Neither'
                  ? 'Neither pays back'
                  : `Recommend: ${eco.drillVsCeor.recommend}`}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {!eco.drillVsCeor.ceorViable ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-600">
                Water cut too high — most mobile oil is already swept, so a chemical flood adds little
              </span>
            ) : (
              <>
                {eco.drillVsCeor.multiplier && (
                  <span className="rounded-full bg-gold-50 px-2.5 py-1 font-medium text-gold-700">
                    Chemicals cost ≈{eco.drillVsCeor.multiplier}× less than drilling this oil
                  </span>
                )}
                <span className="rounded-full bg-black/[0.04] px-2.5 py-1 font-medium text-ink-soft">
                  {eco.drillVsCeor.crossoverWaterCut != null
                    ? `CEOR stays ahead up to ~${eco.drillVsCeor.crossoverWaterCut}% water cut`
                    : 'CEOR wins at every water cut'}
                </span>
              </>
            )}
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

          {/* Buddy's DASH-RESULT crossover view: CEOR vs drill NPV across water cut. */}
          {eco.drillVsCeor.curve.length > 0 && (
            <div className="mt-6 border-t border-black/[0.06] pt-5">
              <p className="text-xs font-medium text-ink-soft">CEOR vs drill across water cut</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                CEOR's advantage shrinks as water cut rises — drilling overtakes it{' '}
                {eco.drillVsCeor.crossoverWaterCut != null
                  ? `near ~${eco.drillVsCeor.crossoverWaterCut}% water cut.`
                  : 'nowhere in the 10–90% range.'}
              </p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={eco.drillVsCeor.curve} margin={{ left: 4, right: 8, top: 18 }}>
                    <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="waterCut"
                      height={40}
                      tick={{ fontSize: 11, fill: '#8e8e93' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      label={{ value: 'Water cut at intervention', position: 'insideBottom', offset: 0, fontSize: 11, fill: '#8e8e93' }}
                    />
                    <YAxis width={70} tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} tickFormatter={(v) => usdAxis(v)} />
                    <Tooltip {...tip} formatter={(v: number, n) => [usdCompact(v), String(n)]} labelFormatter={(l) => `${l}% water cut`} />
                    {eco.currentWaterCut != null && (
                      <ReferenceLine
                        x={Math.round(eco.currentWaterCut / 10) * 10}
                        stroke="#b07523"
                        strokeDasharray="4 4"
                        label={{ value: 'Today', fontSize: 10, fill: '#b07523', position: 'insideTopRight', offset: 6 }}
                      />
                    )}
                    <Line type="monotone" dataKey="ceor" name="CEOR" stroke={GOLD} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="drill" name="Drill" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <Legend items={[{ c: GOLD, t: 'CEOR (chemicals)' }, { c: '#2563eb', t: 'Drill new wells' }]} />
            </div>
          )}
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
