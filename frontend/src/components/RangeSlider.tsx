interface Props {
  min: number
  max: number
  value: [number, number]
  step?: number
  onChange: (v: [number, number]) => void
  format?: (n: number) => string
}

export function RangeSlider({ min, max, value, step = 1, onChange, format = (n) => n.toLocaleString() }: Props) {
  const span = max - min || 1
  const lo = ((value[0] - min) / span) * 100
  const hi = ((value[1] - min) / span) * 100

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] font-medium tabular-nums text-ink-soft">
        <span>{format(value[0])}</span>
        <span>{format(value[1])}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-black/[0.08]" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600"
          style={{ left: `${lo}%`, right: `${100 - hi}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])}
          className="range-thumb"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])}
          className="range-thumb"
        />
      </div>
    </div>
  )
}
