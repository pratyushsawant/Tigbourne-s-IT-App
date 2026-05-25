import { useNavigate } from 'react-router-dom'
import {
  Database,
  Droplets,
  TrendingDown,
  Globe,
  ArrowRight,
} from 'lucide-react'
import { mockFields } from '../data/mockFields'

export default function Dashboard() {
  const navigate = useNavigate()

  const totalFields = mockFields.length
  const activeFields = mockFields.filter(f => f.status === 'Active').length
  const decliningFields = mockFields.filter(f => f.status === 'Declining').length
  const avgWaterCut = (
    mockFields.reduce((sum, f) => sum + f.waterCut_pct, 0) / totalFields
  ).toFixed(1)
  const totalProduction = mockFields.reduce((sum, f) => sum + f.oilRate_bpd, 0)
  const uniqueCountries = new Set(mockFields.map(f => f.country)).size
  const offshoreCount = mockFields.filter(f => f.type === 'Offshore').length
  const highWaterCut = mockFields.filter(f => f.waterCut_pct >= 60).length

  const stats = [
    {
      label: 'Total Fields',
      value: totalFields,
      icon: Database,
      color: 'text-accent',
    },
    {
      label: 'Active Fields',
      value: activeFields,
      icon: Droplets,
      color: 'text-accent-bright',
    },
    {
      label: 'Declining',
      value: decliningFields,
      icon: TrendingDown,
      color: 'text-amber',
    },
    {
      label: 'Countries',
      value: uniqueCountries,
      icon: Globe,
      color: 'text-blue',
    },
  ]

  // Top fields by production
  const topProducers = [...mockFields]
    .sort((a, b) => b.oilRate_bpd - a.oilRate_bpd)
    .slice(0, 5)

  // High water cut fields (intervention candidates)
  const interventionCandidates = [...mockFields]
    .sort((a, b) => b.waterCut_pct - a.waterCut_pct)
    .slice(0, 5)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Oil field data overview — placeholder data
          </p>
        </div>
        <button
          onClick={() => navigate('/explorer')}
          className="flex items-center gap-2 bg-surface-2 border border-border text-text-secondary text-xs px-3 py-2 hover:text-text-primary hover:border-border-light transition-colors cursor-pointer"
        >
          Open Explorer
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div
            key={s.label}
            className="bg-surface-1 border border-border p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-text-muted uppercase tracking-wider">
                {s.label}
              </span>
              <s.icon size={14} className={s.color} />
            </div>
            <div className="text-2xl font-semibold text-text-primary tabular-nums">
              {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface-1 border border-border p-4">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
            Avg Water Cut
          </div>
          <div className="text-lg font-semibold text-text-primary tabular-nums">
            {avgWaterCut}%
          </div>
          <div className="text-[11px] text-text-muted mt-1">Across all fields</div>
        </div>
        <div className="bg-surface-1 border border-border p-4">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
            Total Production
          </div>
          <div className="text-lg font-semibold text-text-primary tabular-nums">
            {(totalProduction / 1000000).toFixed(1)}M bpd
          </div>
          <div className="text-[11px] text-text-muted mt-1">Combined oil rate</div>
        </div>
        <div className="bg-surface-1 border border-border p-4">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
            Intervention Candidates
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-amber tabular-nums">
              {highWaterCut}
            </span>
            <span className="text-[11px] text-text-muted">
              fields with WC &ge; 60%
            </span>
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {offshoreCount} offshore / {totalFields - offshoreCount} onshore total
          </div>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Top producers */}
        <div className="bg-surface-1 border border-border">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-medium text-text-secondary">
              Top Producers by Oil Rate
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted text-[10px] uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">Field</th>
                <th className="text-right px-4 py-2 font-medium">Oil bpd</th>
                <th className="text-right px-4 py-2 font-medium">WC%</th>
              </tr>
            </thead>
            <tbody>
              {topProducers.map(f => (
                <tr
                  key={f.id}
                  onClick={() => navigate(`/field/${f.id}`)}
                  className="border-t border-border hover:bg-surface-2 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="text-text-primary">{f.fieldName}</div>
                    <div className="text-text-muted text-[10px]">{f.operator}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-primary font-mono">
                    {f.oilRate_bpd.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                    <span className={f.waterCut_pct >= 60 ? 'text-amber' : 'text-text-secondary'}>
                      {f.waterCut_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Intervention candidates */}
        <div className="bg-surface-1 border border-border">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-medium text-text-secondary">
              Highest Water Cut — Intervention Candidates
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted text-[10px] uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">Field</th>
                <th className="text-right px-4 py-2 font-medium">WC%</th>
                <th className="text-right px-4 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {interventionCandidates.map(f => (
                <tr
                  key={f.id}
                  onClick={() => navigate(`/field/${f.id}`)}
                  className="border-t border-border hover:bg-surface-2 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="text-text-primary">{f.fieldName}</div>
                    <div className="text-text-muted text-[10px]">{f.country}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                    <span className={
                      f.waterCut_pct >= 80 ? 'text-red' :
                      f.waterCut_pct >= 60 ? 'text-amber' :
                      'text-text-secondary'
                    }>
                      {f.waterCut_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-[10px] px-1.5 py-0.5 ${
                      f.type === 'Offshore'
                        ? 'bg-blue/10 text-blue'
                        : 'bg-accent/10 text-accent'
                    }`}>
                      {f.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
