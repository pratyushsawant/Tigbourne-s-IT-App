import { useEffect, useState } from 'react'
import { apiEnabled, apiGet } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { INews } from '../../components/icons'

interface NewsItem {
  title: string
  url: string
  source: string
  published: string
}
interface NewsResp {
  items: NewsItem[]
  live: boolean
  asOf: string
}

function timeAgo(published: string): string {
  if (!published) return ''
  const then = new Date(published).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export default function News() {
  useDocumentTitle('News')
  const [data, setData] = useState<NewsResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let on = true
    apiGet<NewsResp>('/api/news').then((r) => {
      if (on) {
        setData(r)
        setLoading(false)
      }
    })
    return () => {
      on = false
    }
  }, [])

  const items = data?.items?.filter((i) => i.url && i.url !== '/') ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Industry news</h1>
        {data?.live && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            live
          </span>
        )}
      </div>
      <p className="text-sm text-ink-muted">
        Current CEOR and oil &amp; gas headlines — refreshed automatically as new stories break.
      </p>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-black/[0.06] bg-black/[0.03]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/[0.12] p-10 text-center">
          <INews className="mx-auto h-7 w-7 text-ink-faint" />
          <p className="mt-3 text-sm font-medium text-ink">No live headlines right now.</p>
          <p className="mt-1 text-xs text-ink-muted">
            {apiEnabled ? 'The news feed is temporarily unavailable — check back shortly.' : 'Connect the backend to stream live industry news here.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((it, i) => (
            <a
              key={`${it.url}-${i}`}
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-black/[0.06] bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-float"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-gold-600">
                <span className="truncate">{it.source || 'News'}</span>
                {timeAgo(it.published) && (
                  <>
                    <span className="text-ink-faint/50">·</span>
                    <span className="text-ink-faint">{timeAgo(it.published)}</span>
                  </>
                )}
              </div>
              <p className="mt-1.5 text-[15px] font-semibold leading-snug text-ink transition group-hover:text-gold-700">
                {it.title}
              </p>
            </a>
          ))}
        </div>
      )}

      {data && (
        <p className="mt-6 text-center text-[11px] text-ink-faint">
          Headlines aggregated from public news sources · updated {data.asOf ? new Date(data.asOf).toLocaleString() : 'recently'}.
        </p>
      )}
    </div>
  )
}
