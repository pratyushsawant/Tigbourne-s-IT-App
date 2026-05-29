import { useMemo } from 'react'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { FIELDS } from '../../lib/fields'

const GOLD = ['#d4a749', '#c8922f', '#b07523', '#dfbe6e', '#8f581f', '#e9c877']

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card ${className}`}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
      <div className="mt-5 h-64">{children}</div>
    </div>
  )
}

const tip = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    fontSize: 12,
    padding: '8px 12px',
  },
}

export default function Analytics() {
  useDocumentTitle('Analytics')
  const byRegion = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of FIELDS) m.set(f.region, (m.get(f.region) || 0) + 1)
    return [...m].map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count)
  }, [])

  const shoreSplit = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of FIELDS) m.set(f.shore, (m.get(f.shore) || 0) + 1)
    return [...m].map(([name, value]) => ({ name, value }))
  }, [])

  const waterCutDist = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({ band: `${i * 10}–${i * 10 + 10}`, count: 0 }))
    for (const f of FIELDS) {
      if (f.waterCut == null) continue
      const idx = Math.min(9, Math.floor(f.waterCut / 10))
      buckets[idx].count++
    }
    return buckets
  }, [])

  const topOperators = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of FIELDS) m.set(f.operator, (m.get(f.operator) || 0) + (f.oilBblPerDay || 0))
    return [...m]
      .map(([operator, oil]) => ({ operator: operator.length > 18 ? operator.slice(0, 17) + '…' : operator, oil }))
      .sort((a, b) => b.oil - a.oil)
      .slice(0, 8)
  }, [])

  const scatter = useMemo(
    () =>
      FIELDS.filter((f) => f.api != null && f.bht != null && (f.oilBblPerDay || 0) > 0)
        .map((f) => ({
          api: f.api,
          bht: f.bht,
          oil: f.oilBblPerDay,
          sweet: (f.api as number) >= 16 && (f.api as number) <= 40 && (f.bht as number) < 130,
        }))
        .slice(0, 600),
    [],
  )

  const totalOil = FIELDS.reduce((s, f) => s + (f.oilBblPerDay || 0), 0)
  const sweetCount = FIELDS.filter((f) => f.api != null && f.bht != null && f.api >= 16 && f.api <= 40 && f.bht < 130).length

  const kpis = [
    { v: FIELDS.length.toLocaleString(), l: 'Fields in dataset' },
    { v: `${(totalOil / 1_000_000).toFixed(1)}M`, l: 'Total bbl/d tracked' },
    { v: sweetCount.toLocaleString(), l: 'In chemical sweet spot' },
    { v: `${Math.round((shoreSplit.find((s) => s.name === 'Offshore')?.value || 0) / FIELDS.length * 100)}%`, l: 'Offshore' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
        <p className="text-sm text-ink-muted">Portfolio-level intelligence across the full {FIELDS.length.toLocaleString()}-field dataset.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-card">
            <p className="text-3xl font-semibold tracking-tight text-ink">{k.v}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-faint">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Fields by region" subtitle="Coverage across global basins">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byRegion} margin={{ left: -16 }}>
              <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tip} cursor={{ fill: 'rgba(212,167,73,0.08)' }} formatter={(v: number) => [`${v.toLocaleString()} fields`, 'Fields']} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {byRegion.map((_, i) => (
                  <Cell key={i} fill={GOLD[i % GOLD.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Water-cut distribution" subtitle="Intervention timing window — lower is earlier, worth ~10× more">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterCutDist} margin={{ left: -16 }}>
              <XAxis dataKey="band" tick={{ fontSize: 10, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tip} cursor={{ fill: 'rgba(212,167,73,0.08)' }} formatter={(v: number) => [`${v.toLocaleString()} fields`, 'Fields']} labelFormatter={(l) => `${l}% water cut`} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {waterCutDist.map((_, i) => (
                  <Cell key={i} fill={i < 4 ? '#c8922f' : '#dfbe6e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top operators by oil production" subtitle="Aggregate bbl/d across tracked fields">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topOperators} layout="vertical" margin={{ left: 8, right: 12 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#8e8e93' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="operator" width={120} tick={{ fontSize: 10, fill: '#3c3c43' }} axisLine={false} tickLine={false} />
              <Tooltip {...tip} cursor={{ fill: 'rgba(212,167,73,0.08)' }} formatter={(v: number) => [`${v.toLocaleString()} bbl/d`, 'Oil']} />
              <Bar dataKey="oil" radius={[0, 6, 6, 0]} fill="#c8922f" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Onshore vs offshore" subtitle="Location split — drives recovery economics">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={shoreSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {shoreSplit.map((s, i) => (
                  <Cell key={i} fill={s.name === 'Offshore' ? '#b07523' : '#dfbe6e'} />
                ))}
              </Pie>
              <Tooltip {...tip} formatter={(v: number, n) => [`${v.toLocaleString()} fields`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-5 text-xs">
            {shoreSplit.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-ink-soft">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.name === 'Offshore' ? '#b07523' : '#dfbe6e' }} />
                {s.name} · {s.value.toLocaleString()}
              </span>
            ))}
          </div>
        </Card>

        <Card title="API gravity vs reservoir temperature" subtitle="Each point a field — gold = inside chemical recovery sweet spot" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: -8, bottom: 8 }}>
              <XAxis type="number" dataKey="api" name="API" unit="°" tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} domain={[0, 60]} label={{ value: 'API gravity (°)', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#8e8e93' }} />
              <YAxis type="number" dataKey="bht" name="BHT" unit="°C" tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
              <ZAxis type="number" dataKey="oil" name="Oil" range={[20, 320]} />
              <Tooltip
                {...tip}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v: number, n) =>
                  n === 'Oil'
                    ? [`${v.toLocaleString()} bbl/d`, 'Oil production']
                    : n === 'API'
                      ? [`${v}°`, 'API gravity']
                      : [`${v}°C`, 'Reservoir temp']
                }
              />
              <Scatter data={scatter.filter((s) => s.sweet)} fill="#c8922f" fillOpacity={0.55} />
              <Scatter data={scatter.filter((s) => !s.sweet)} fill="#c9c9ce" fillOpacity={0.45} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
