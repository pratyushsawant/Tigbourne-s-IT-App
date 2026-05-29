import { useEffect, useMemo, useRef } from 'react'
import { FIELDS } from '../lib/fields'

// Approximate lat/long centroids per region (the dataset has no coordinates).
const REGION_CENTROID: Record<string, [number, number]> = {
  Asia: [34, 100],
  'Middle East': [26, 48],
  Africa: [4, 21],
  Europe: [54, 12],
  'North America': [42, -100],
  LATAM: [-12, -58],
}
const REGION_SPREAD: Record<string, number> = {
  Asia: 26,
  'Middle East': 12,
  Africa: 26,
  Europe: 16,
  'North America': 22,
  LATAM: 24,
}

// Deterministic pseudo-random in [-1,1] from an integer seed.
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

interface Pt {
  x: number
  y: number
  z: number
}

function latLonToVec(lat: number, lon: number): Pt {
  const la = (lat * Math.PI) / 180
  const lo = (lon * Math.PI) / 180
  return { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: Math.cos(la) * Math.sin(lo) }
}

export function Globe({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Field dots (sampled) + a faint lattice/graticule of dots forming the sphere.
  const { fields, lattice } = useMemo(() => {
    const step = Math.max(1, Math.ceil(FIELDS.length / 620))
    const fields: Pt[] = []
    FIELDS.forEach((f, i) => {
      if (i % step !== 0) return
      const c = REGION_CENTROID[f.region]
      if (!c) return
      const spread = REGION_SPREAD[f.region] ?? 20
      const lat = c[0] + rnd(f.id) * spread
      const lon = c[1] + rnd(f.id * 7 + 3) * spread * 1.4
      fields.push(latLonToVec(Math.max(-85, Math.min(85, lat)), lon))
    })
    const lattice: Pt[] = []
    for (let lat = -80; lat <= 80; lat += 8) {
      for (let lon = 0; lon < 360; lon += 8) lattice.push(latLonToVec(lat, lon))
    }
    return { fields, lattice }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const tilt = (-18 * Math.PI) / 180
    const cosT = Math.cos(tilt)
    const sinT = Math.sin(tilt)
    let angle = 0
    let raf = 0

    const draw = () => {
      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) * 0.46
      ctx.clearRect(0, 0, w, h)

      // soft sphere glow
      const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.05)
      g.addColorStop(0, 'rgba(212,167,73,0.10)')
      g.addColorStop(0.7, 'rgba(212,167,73,0.04)')
      g.addColorStop(1, 'rgba(212,167,73,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2)
      ctx.fill()

      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)

      const project = (p: Pt) => {
        // rotate about Y, then tilt about X
        const x1 = p.x * cosA - p.z * sinA
        const z1 = p.x * sinA + p.z * cosA
        const y2 = p.y * cosT - z1 * sinT
        const z2 = p.y * sinT + z1 * cosT
        return { sx: cx + x1 * R, sy: cy - y2 * R, depth: z2 }
      }

      // lattice dots (the globe surface)
      for (const p of lattice) {
        const { sx, sy, depth } = project(p)
        const front = (depth + 1) / 2 // 0 back .. 1 front
        const alpha = 0.08 + front * 0.32
        const r = 0.7 + front * 1.0
        ctx.fillStyle = `rgba(126,112,84,${alpha})`
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // field dots (gold, highlighted, front-weighted)
      for (const p of fields) {
        const { sx, sy, depth } = project(p)
        if (depth < -0.15) continue
        const front = (depth + 1) / 2
        const alpha = 0.35 + front * 0.6
        const r = 1.3 + front * 1.9
        // subtle halo on the brightest front dots
        if (front > 0.82) {
          ctx.fillStyle = `rgba(212,167,73,0.18)`
          ctx.beginPath()
          ctx.arc(sx, sy, r * 2.4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = `rgba(196,140,42,${alpha})`
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reduce) {
        angle += 0.0018
        raf = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [fields, lattice])

  return <canvas ref={canvasRef} className={className} aria-hidden />
}
