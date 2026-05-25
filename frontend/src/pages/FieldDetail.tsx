import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Thermometer, Droplets, DollarSign, Layers } from 'lucide-react'
import { mockFields } from '../data/mockFields'

export default function FieldDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const field = mockFields.find(f => f.id === id)

  if (!field) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/explorer')}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to Explorer
        </button>
        <div className="text-text-muted text-sm">Field not found.</div>
      </div>
    )
  }

  const waterCutColor =
    field.waterCut_pct >= 80 ? 'text-red' :
    field.waterCut_pct >= 60 ? 'text-amber' :
    'text-accent-bright'

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="bg-surface-1 border border-border">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Icon size={14} className="text-text-muted" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )

  const Row = ({ label, value, unit, highlight }: { label: string; value: string | number; unit?: string; highlight?: string }) => (
    <div className="flex items-baseline justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm font-mono tabular-nums ${highlight || 'text-text-primary'}`}>
        {value}{unit && <span className="text-text-muted text-[10px] ml-1">{unit}</span>}
      </span>
    </div>
  )

  return (
    <div className="p-6 max-w-[1100px]">
      {/* Back button */}
      <button
        onClick={() => navigate('/explorer')}
        className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4 cursor-pointer"
      >
        <ArrowLeft size={14} />
        Back to Explorer
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-text-primary">{field.fieldName}</h1>
            <span className={`text-[10px] px-1.5 py-0.5 ${
              field.status === 'Active' ? 'bg-accent/10 text-accent' :
              field.status === 'Declining' ? 'bg-amber/10 text-amber' :
              'bg-red/10 text-red'
            }`}>
              {field.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span>{field.operator}</span>
            <span className="text-border">|</span>
            <span>{field.country}, {field.region}</span>
            <span className="text-border">|</span>
            <span className={`text-[10px] px-1.5 py-0.5 ${
              field.type === 'Offshore' ? 'bg-blue/10 text-blue' : 'bg-accent/10 text-accent'
            }`}>
              {field.type}
            </span>
            <span className="text-border">|</span>
            <span className="font-mono">{field.id}</span>
          </div>
        </div>

        {/* Key metric highlight */}
        <div className="bg-surface-1 border border-border px-5 py-3 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Water Cut</div>
          <div className={`text-2xl font-semibold font-mono tabular-nums ${waterCutColor}`}>
            {field.waterCut_pct}%
          </div>
        </div>
      </div>

      {/* Water cut visual bar */}
      <div className="bg-surface-1 border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Water Cut Position</span>
          <span className="text-[10px] text-text-muted">
            {field.waterCut_pct <= 30 ? 'Early stage — ideal for intervention' :
             field.waterCut_pct <= 60 ? 'Mid stage — intervention still valuable' :
             'Late stage — reduced intervention value'}
          </span>
        </div>
        <div className="relative h-3 bg-surface-3 overflow-hidden">
          {/* Gradient zones */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-accent/20" />
            <div className="flex-1 bg-amber/20" />
            <div className="flex-1 bg-red/20" />
          </div>
          {/* Marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-text-primary"
            style={{ left: `${field.waterCut_pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-accent">0% — Low</span>
          <span className="text-[9px] text-amber">33% — Medium</span>
          <span className="text-[9px] text-red">66% — High</span>
          <span className="text-[9px] text-text-muted">100%</span>
        </div>
      </div>

      {/* Data sections */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Section title="Production" icon={Droplets}>
          <Row label="Oil Rate" value={field.oilRate_bpd.toLocaleString()} unit="bpd" />
          <Row label="Total Liquid Rate" value={field.liquidRate_bpd.toLocaleString()} unit="bpd" />
          <Row label="Water Rate" value={field.waterRate_bpd.toLocaleString()} unit="bpd" />
          <Row label="Water Cut" value={`${field.waterCut_pct}%`} highlight={waterCutColor} />
        </Section>

        <Section title="Reservoir Conditions" icon={Thermometer}>
          <Row label="API Gravity" value={field.apiGravity} unit="°" highlight={
            field.apiGravity >= 16 && field.apiGravity <= 40 ? 'text-accent-bright' : 'text-amber'
          } />
          <Row label="Temperature" value={field.temperature_c} unit="°C" highlight={
            field.temperature_c > 130 ? 'text-red' : 'text-text-primary'
          } />
          <Row label="Salinity" value={field.salinity_ppm.toLocaleString()} unit="ppm" />
          <Row label="Viscosity" value={field.viscosity_cp} unit="cP" />
          <Row label="Porosity" value={`${field.porosity_pct}%`} />
          <Row label="Permeability" value={field.permeability_md.toLocaleString()} unit="mD" />
        </Section>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Section title="Location" icon={MapPin}>
          <Row label="Country" value={field.country} />
          <Row label="Region" value={field.region} />
          <Row label="Type" value={field.type} />
          <Row label="Depth" value={field.depth_m.toLocaleString()} unit="m" />
        </Section>

        <Section title="Cost Data" icon={DollarSign}>
          <Row label="Lifting Cost" value={`$${field.liftingCost_usd.toFixed(2)}`} unit="/bbl" />
          <Row label="Drilling & Completion" value={`$${field.drillingCost_usd.toLocaleString()}`} />
          <Row
            label="P&A Estimate"
            value={field.paEstimate_usd ? `$${field.paEstimate_usd.toLocaleString()}` : 'Not available'}
            highlight={field.paEstimate_usd ? 'text-text-primary' : 'text-amber'}
          />
        </Section>
      </div>

      {/* Placeholder for future CEOR section */}
      <div className="mt-4 bg-surface-1 border border-border/50 border-dashed p-6 text-center">
        <Layers size={20} className="text-text-muted mx-auto mb-2" />
        <div className="text-xs text-text-muted">
          CEOR Analysis & NPV Modelling — available after MVP
        </div>
      </div>
    </div>
  )
}
