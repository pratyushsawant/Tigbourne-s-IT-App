import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { FilterState, SortState, OilField } from '../data/types'
import { mockFields } from '../data/mockFields'
import FilterPanel, { defaultFilters } from '../components/FilterPanel'
import ExportMenu from '../components/ExportMenu'

const PAGE_SIZE = 10

export default function Explorer() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sort, setSort] = useState<SortState>({ column: 'fieldName', direction: 'asc' })
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    let result = [...mockFields]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        f =>
          f.fieldName.toLowerCase().includes(q) ||
          f.operator.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          f.country.toLowerCase().includes(q)
      )
    }
    if (filters.country) result = result.filter(f => f.country === filters.country)
    if (filters.type) result = result.filter(f => f.type === filters.type)
    if (filters.status) result = result.filter(f => f.status === filters.status)
    result = result.filter(
      f => f.waterCut_pct >= filters.waterCutMin && f.waterCut_pct <= filters.waterCutMax
    )

    // Sort
    result.sort((a, b) => {
      const av = a[sort.column]
      const bv = b[sort.column]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.direction === 'asc' ? cmp : -cmp
    })

    return result
  }, [filters, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const toggleSort = (column: keyof OilField) => {
    setSort(prev =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    )
    setPage(0)
  }

  const SortIcon = ({ column }: { column: keyof OilField }) => {
    if (sort.column !== column) return <span className="w-3" />
    return sort.direction === 'asc' ? (
      <ChevronUp size={12} className="text-accent" />
    ) : (
      <ChevronDown size={12} className="text-accent" />
    )
  }

  const columns: { key: keyof OilField; label: string; align?: 'right'; format?: (v: OilField) => string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'fieldName', label: 'Field Name' },
    { key: 'operator', label: 'Operator' },
    { key: 'country', label: 'Country' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'oilRate_bpd', label: 'Oil (bpd)', align: 'right', format: f => f.oilRate_bpd.toLocaleString() },
    { key: 'waterCut_pct', label: 'WC%', align: 'right', format: f => f.waterCut_pct.toFixed(1) },
    { key: 'apiGravity', label: 'API', align: 'right', format: f => f.apiGravity.toFixed(1) },
    { key: 'temperature_c', label: 'Temp C', align: 'right', format: f => String(f.temperature_c) },
    { key: 'liftingCost_usd', label: '$/bbl', align: 'right', format: f => `$${f.liftingCost_usd.toFixed(2)}` },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Field Explorer</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {filtered.length} field{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <ExportMenu data={filtered} />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FilterPanel filters={filters} onChange={f => { setFilters(f); setPage(0) }} />
      </div>

      {/* Data Table */}
      <div className="bg-surface-1 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-2">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`px-3 py-2.5 font-medium text-text-muted text-[10px] uppercase tracking-wider cursor-pointer hover:text-text-secondary transition-colors select-none whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon column={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-text-muted text-sm">
                    No fields match your filters
                  </td>
                </tr>
              ) : (
                paged.map(field => (
                  <tr
                    key={field.id}
                    onClick={() => navigate(`/field/${field.id}`)}
                    className="border-t border-border hover:bg-surface-2/60 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5 text-text-muted font-mono text-[11px]">{field.id}</td>
                    <td className="px-3 py-2.5 text-text-primary font-medium whitespace-nowrap">{field.fieldName}</td>
                    <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{field.operator}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{field.country}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 ${
                        field.type === 'Offshore' ? 'bg-blue/10 text-blue' : 'bg-accent/10 text-accent'
                      }`}>
                        {field.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 ${
                        field.status === 'Active' ? 'bg-accent/10 text-accent' :
                        field.status === 'Declining' ? 'bg-amber/10 text-amber' :
                        'bg-red/10 text-red'
                      }`}>
                        {field.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-text-primary">
                      {field.oilRate_bpd.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono">
                      <span className={
                        field.waterCut_pct >= 80 ? 'text-red' :
                        field.waterCut_pct >= 60 ? 'text-amber' :
                        'text-text-primary'
                      }>
                        {field.waterCut_pct.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-text-secondary">
                      {field.apiGravity.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-text-secondary">
                      {field.temperature_c}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono text-text-secondary">
                      ${field.liftingCost_usd.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-2/40">
            <span className="text-[11px] text-text-muted">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs px-2.5 py-1 bg-surface-2 border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`text-xs px-2.5 py-1 border transition-colors cursor-pointer ${
                    i === page
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="text-xs px-2.5 py-1 bg-surface-2 border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
