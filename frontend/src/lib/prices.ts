import { useEffect, useState } from 'react'

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

/** The price the economics engine defaults its scenario to (updated when a live feed loads). */
export function brentPrice(state?: PriceState): number {
  const q = (state?.quotes ?? REFERENCE_PRICES).find((x) => x.symbol === 'BRENT')
  return q?.price ?? 75
}

let cache: PriceState | null = null
let inflight: Promise<PriceState | null> | null = null

/**
 * Best-effort live fetch from Stooq's keyless CSV endpoint (Brent = cb.f, WTI = cl.f).
 * Many browsers block this with CORS — when that happens we fall back to reference prices,
 * clearly labelled. The intended production source is the backend `/prices/forward-curve`
 * endpoint, which this hook can point at by changing the URL below.
 */
async function fetchLive(): Promise<PriceState | null> {
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
