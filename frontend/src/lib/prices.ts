import { useEffect, useState } from 'react'
import { apiGet } from './api'

export interface Quote {
  symbol: string
  label: string
  price: number
  change: number // absolute $ change on the day
}

export interface PriceState {
  quotes: Quote[]
  live: boolean
  asOf: string
}

/** Reference benchmarks used until a live feed responds (and as the fallback). */
export const REFERENCE_PRICES: Quote[] = [
  { symbol: 'BRENT', label: 'Brent', price: 75, change: 0 },
  { symbol: 'WTI', label: 'WTI', price: 71.2, change: 0 },
  { symbol: 'DUBAI', label: 'Dubai', price: 73.4, change: 0 },
]

const FALLBACK: PriceState = { quotes: REFERENCE_PRICES, live: false, asOf: 'reference' }

export type Benchmark = 'BRENT' | 'WTI' | 'DUBAI'

/** The price the economics engine defaults its scenario to (updated when a live feed loads). */
export function brentPrice(state?: PriceState): number {
  const q = (state?.quotes ?? REFERENCE_PRICES).find((x) => x.symbol === 'BRENT')
  return q?.price ?? 75
}

/** Live price for a chosen benchmark (Brent / WTI / Dubai), feeding the economics calculations. */
export function benchmarkPrice(state: PriceState | undefined, symbol: Benchmark): number {
  const q = (state?.quotes ?? REFERENCE_PRICES).find((x) => x.symbol === symbol)
  return q?.price ?? brentPrice(state)
}

let cache: PriceState | null = null
let inflight: Promise<PriceState | null> | null = null

/**
 * Best-effort live fetch from Stooq's keyless CSV endpoint (Brent = cb.f, WTI = cl.f).
 * Many browsers block this with CORS — when that happens we fall back to reference prices,
 * clearly labelled. The intended production source is the backend `/prices/forward-curve`
 * endpoint, which this hook can point at by changing the URL below.
 */
/** Server-side feed via the backend (avoids browser CORS); preferred when the API is wired. */
async function fetchFromApi(): Promise<PriceState | null> {
  const data = await apiGet<{ quotes: { symbol: string; name?: string; price: number; change?: number }[]; live: boolean; asOf: string }>(
    '/api/prices/forward-curve',
  )
  if (!data || !Array.isArray(data.quotes) || !data.quotes.length) return null
  const quotes: Quote[] = data.quotes.map((q) => ({
    symbol: q.symbol,
    label: q.name || q.symbol,
    price: Math.round(q.price * 100) / 100,
    change: Math.round((q.change ?? 0) * 100) / 100,
  }))
  return { quotes, live: data.live, asOf: data.asOf || 'today' }
}

async function fetchLive(): Promise<PriceState | null> {
  const fromApi = await fetchFromApi()
  if (fromApi) return fromApi
  try {
    const url = 'https://stooq.com/q/l/?s=cb.f+cl.f&f=sd2t2oc&h&e=csv'
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.trim().split('\n').slice(1) // drop header
    const map: Record<string, { price: number; change: number }> = {}
    let asOf = ''
    for (const line of lines) {
      const [sym, date, , open, close] = line.split(',')
      const c = Number(close)
      const o = Number(open)
      if (!Number.isFinite(c) || c <= 0) continue
      asOf = date || asOf
      if (sym?.toLowerCase().startsWith('cb')) map.BRENT = { price: c, change: Number.isFinite(o) ? c - o : 0 }
      if (sym?.toLowerCase().startsWith('cl')) map.WTI = { price: c, change: Number.isFinite(o) ? c - o : 0 }
    }
    if (!map.BRENT && !map.WTI) return null
    const quotes: Quote[] = REFERENCE_PRICES.map((q) => {
      const hit = map[q.symbol]
      return hit ? { ...q, price: Math.round(hit.price * 100) / 100, change: Math.round(hit.change * 100) / 100 } : q
    })
    return { quotes, live: true, asOf: asOf || 'today' }
  } catch {
    return null
  }
}

export function usePrices(): PriceState {
  const [state, setState] = useState<PriceState>(cache ?? FALLBACK)
  useEffect(() => {
    if (cache?.live) return
    inflight ??= fetchLive()
    inflight.then((r) => {
      if (r) {
        cache = r
        setState(r)
      }
    })
  }, [])
  return state
}

// --- Forward / forecast curve (Brent / WTI / Dubai term structure) ---
export interface ForwardPoint {
  period: string // "YYYY-MM"
  brent: number
  wti: number
  dubai: number
}
export interface ForwardState {
  points: ForwardPoint[]
  live: boolean
  asOf: string
  source: string
}

// Annual Brent forward shape (matches FORWARD_CURVE in economics) — offline fallback only.
const FWD_SHAPE = [
  62.78, 62.33, 63.54, 65.02, 66.2, 66.92, 67.46, 67.73, 67.74, 67.74, 67.74, 67.74, 67.74,
  67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74,
]
function shapeRatio(m: number): number {
  const y = m / 12
  const i = Math.min(Math.floor(y), FWD_SHAPE.length - 2)
  return FWD_SHAPE[i] / FWD_SHAPE[0] + (y - i) * ((FWD_SHAPE[i + 1] - FWD_SHAPE[i]) / FWD_SHAPE[0])
}
function fallbackForward(quotes: Quote[] = REFERENCE_PRICES): ForwardPoint[] {
  const get = (s: string) => quotes.find((q) => q.symbol === s)?.price ?? (s === 'BRENT' ? 75 : s === 'WTI' ? 71.2 : 73.4)
  const brent = get('BRENT')
  const dubaiDiff = brent - get('DUBAI')
  const wti = get('WTI')
  const now = new Date()
  const pts: ForwardPoint[] = []
  for (let m = 0; m < 24; m++) {
    const idx = now.getMonth() + m
    const period = `${now.getFullYear() + Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
    const r = shapeRatio(m)
    const b = Math.round(brent * r * 100) / 100
    pts.push({ period, brent: b, wti: Math.round(wti * r * 100) / 100, dubai: Math.round((b - dubaiDiff) * 100) / 100 })
  }
  return pts
}

let fwdCache: ForwardState | null = null
let fwdInflight: Promise<ForwardState | null> | null = null

async function fetchForward(): Promise<ForwardState | null> {
  const data = await apiGet<{ months: ForwardPoint[]; live: boolean; asOf: string; source: string }>('/api/prices/forward')
  if (data && Array.isArray(data.months) && data.months.length) {
    return { points: data.months, live: data.live, asOf: data.asOf, source: data.source }
  }
  return null
}

export function useForwardCurve(): ForwardState {
  const [state, setState] = useState<ForwardState>(
    fwdCache ?? { points: fallbackForward(), live: false, asOf: 'forecast', source: 'shape' },
  )
  useEffect(() => {
    if (fwdCache?.live) return
    fwdInflight ??= fetchForward()
    fwdInflight.then((r) => {
      if (r) {
        fwdCache = r
        setState(r)
      }
    })
  }, [])
  return state
}
