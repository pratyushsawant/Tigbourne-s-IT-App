import { Search, RotateCcw } from 'lucide-react'
import type { FilterState } from '../data/types'
import { countries } from '../data/mockFields'

interface Props {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

const defaultFilters: FilterState = {
  search: '',
  country: '',
  type: '',
  status: '',
  waterCutMin: 0,
  waterCutMax: 100,
  apiGravityMin: 0,
  apiGravityMax: 60,
}

export default function FilterPanel({ filters, onChange }: Props) {
  const update = (partial: Partial<FilterState>) =>
    onChange({ ...filters, ...partial })

  const selectClass =
    'bg-surface-2 border border-border text-text-primary text-xs px-2.5 py-1.5 focus:outline-none focus:border-accent appearance-none cursor-pointer'

  return (
    <div className="bg-surface-1 border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Filters
        </span>
        <button
          onClick={() => onChange(defaultFilters)}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="Search fields, operators..."
              value={filters.search}
              onChange={e => update({ search: e.target.value })}
              className="w-full bg-surface-2 border border-border text-text-primary text-xs pl-8 pr-3 py-1.5 focus:outline-none focus:border-accent placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Country */}
        <div>
          <select
            value={filters.country}
            onChange={e => update({ country: e.target.value })}
            className={selectClass}
          >
            <option value="">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <select
            value={filters.type}
            onChange={e => update({ type: e.target.value })}
            className={selectClass}
          >
            <option value="">All Types</option>
            <option value="Onshore">Onshore</option>
            <option value="Offshore">Offshore</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <select
            value={filters.status}
            onChange={e => update({ status: e.target.value })}
            className={selectClass}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Declining">Declining</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Water Cut Range */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted uppercase">WC%</span>
          <input
            type="number"
            min={0}
            max={100}
            value={filters.waterCutMin}
            onChange={e => update({ waterCutMin: Number(e.target.value) })}
            className="w-14 bg-surface-2 border border-border text-text-primary text-xs px-2 py-1.5 focus:outline-none focus:border-accent tabular-nums"
          />
          <span className="text-text-muted text-xs">-</span>
          <input
            type="number"
            min={0}
            max={100}
            value={filters.waterCutMax}
            onChange={e => update({ waterCutMax: Number(e.target.value) })}
            className="w-14 bg-surface-2 border border-border text-text-primary text-xs px-2 py-1.5 focus:outline-none focus:border-accent tabular-nums"
          />
        </div>
      </div>
    </div>
  )
}

export { defaultFilters }
