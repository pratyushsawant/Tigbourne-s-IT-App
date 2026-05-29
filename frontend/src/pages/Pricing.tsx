import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MarketingShell } from '../components/MarketingShell'
import { TIERS, TIER_META, useAuth, type Tier } from '../context/AuthContext'
import { startCheckout } from '../lib/billing'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { FIELDS } from '../lib/fields'
import { IArrow, ICheck, IClose } from '../components/icons'

const COUNTRIES = new Set(FIELDS.map((f) => f.country)).size

// Feature matrix rows (label, per-tier availability)
const MATRIX: { label: string; vals: Record<Tier, boolean | string> }[] = [
  { label: 'Field explorer & multi-parameter filters', vals: { Individual: true, Institutional: true, Enterprise: true } },
  { label: 'Analytics dashboards', vals: { Individual: true, Institutional: true, Enterprise: true } },
  { label: 'CEOR & NPV economics', vals: { Individual: false, Institutional: true, Enterprise: true } },
  { label: 'Break-even & water-cut intervention', vals: { Individual: false, Institutional: true, Enterprise: true } },
  { label: 'Export (CSV · PDF · Word)', vals: { Individual: false, Institutional: true, Enterprise: true } },
  { label: 'Data-integrity & audit log', vals: { Individual: false, Institutional: false, Enterprise: true } },
  { label: 'API access & keys', vals: { Individual: false, Institutional: false, Enterprise: true } },
  { label: 'SSO & dedicated support', vals: { Individual: false, Institutional: false, Enterprise: true } },
  { label: 'Seats', vals: { Individual: '1', Institutional: 'Up to 5', Enterprise: 'Unlimited' } },
]

const FAQ = [
  { q: 'How is the data delivered?', a: 'Through the web platform and, on Enterprise, a documented API — as formatted, constantly-updated analysis, never raw files. The dataset spans ' + FIELDS.length.toLocaleString() + ' fields across ' + COUNTRIES + ' countries.' },
  { q: 'Can we trial before committing?', a: 'Yes — we run a 14-day pilot on a region of your choice, and design-partner terms are available for early enterprise logos.' },
  { q: 'How are Enterprise contracts priced?', a: 'Custom, based on seats, API volume and support level — typically a six-figure annual contract, invoiced. Talk to our team for a quote.' },
  { q: 'Is our usage confidential?', a: 'Every dataset is governed by NDA and non-circumvention terms. Your screens and exports stay yours.' },
]

function StubModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-float animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-ink">Checkout ready</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{message}</p>
        <button onClick={onClose} className="btn-gold mt-5 w-full !py-3">
          Got it
        </button>
      </div>
    </div>
  )
}

export default function Pricing() {
  useDocumentTitle('Pricing', 'Tigbourne Oil Field Intelligence pricing — Individual, Institutional and Enterprise plans.')
  const nav = useNavigate()
  const { user } = useAuth()
  const [busy, setBusy] = useState<Tier | null>(null)
  const [stub, setStub] = useState<string | null>(null)

  async function choose(tier: Tier) {
    setBusy(tier)
    const res = await startCheckout(tier)
    setBusy(null)
    if (res.status === 'contact') nav('/contact')
    else if (res.status === 'redirect' && res.url) window.location.href = res.url
    else setStub(res.message || 'Checkout is not available in this demo build.')
  }

  return (
    <MarketingShell>
      <section className="relative overflow-hidden py-20">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gold-200/30 blur-[120px]" />
        <div className="container-x relative">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/60 bg-gold-50 px-3.5 py-1.5 text-xs font-semibold text-gold-700">
              Pricing
            </span>
            <h1 className="mt-5 text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
              Priced for the desks that <span className="text-gradient-gold">value a field correctly.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-muted">
              Annual plans for analysts, teams and enterprises. Every tier is built on the same
              moat — field data paired with chemical-recovery economics no competitor has.
            </p>
          </div>

          {/* Tier cards */}
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
            {TIERS.map((tier) => {
              const m = TIER_META[tier]
              const current = user?.tier === tier
              return (
                <div
                  key={tier}
                  className={`relative flex flex-col rounded-3xl border bg-white p-7 transition ${
                    m.highlight ? 'border-gold-300 shadow-float ring-1 ring-gold-200' : 'border-black/[0.07] shadow-card'
                  }`}
                >
                  {m.highlight && (
                    <span className="absolute -top-3 left-7 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-semibold text-white shadow-gold">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-ink">{tier}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{m.blurb}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-ink">{m.price}</span>
                    <span className="text-sm text-ink-faint">{m.period}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{m.priceNote}</p>
                  <button
                    onClick={() => choose(tier)}
                    disabled={busy === tier || current}
                    className={`mt-6 w-full !py-3 ${m.highlight ? 'btn-gold' : 'btn-dark'} disabled:opacity-60`}
                  >
                    {current ? 'Your current plan' : busy === tier ? 'Starting…' : m.cta === 'sales' ? 'Contact sales' : 'Start subscription'}
                  </button>
                  <ul className="mt-6 space-y-2.5 border-t border-black/[0.06] pt-6">
                    {m.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm text-ink-soft">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                          <ICheck className="h-2.5 w-2.5" />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Feature matrix */}
          <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.07] bg-[#f7f7f8] text-left">
                  <th className="px-6 py-4 font-semibold text-ink">Compare plans</th>
                  {TIERS.map((t) => (
                    <th key={t} className="px-4 py-4 text-center font-semibold text-ink">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row, i) => (
                  <tr key={row.label} className={`border-b border-black/[0.04] ${i % 2 ? 'bg-[#fcfcfd]' : ''}`}>
                    <td className="px-6 py-3 text-ink-soft">{row.label}</td>
                    {TIERS.map((t) => {
                      const v = row.vals[t]
                      return (
                        <td key={t} className="px-4 py-3 text-center">
                          {typeof v === 'string' ? (
                            <span className="text-sm font-medium text-ink">{v}</span>
                          ) : v ? (
                            <ICheck className="mx-auto h-4 w-4 text-gold-600" />
                          ) : (
                            <IClose className="mx-auto h-3.5 w-3.5 text-ink-faint/40" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-ink">Questions</h2>
            <div className="mt-8 space-y-4">
              {FAQ.map((f) => (
                <div key={f.q} className="card p-6">
                  <h3 className="text-sm font-semibold text-ink">{f.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-2xl text-center">
            <p className="text-sm text-ink-muted">Not sure which plan fits your mandate?</p>
            <button onClick={() => nav('/contact')} className="btn-ghost mt-4">
              Talk to our team <IArrow className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      {stub && <StubModal message={stub} onClose={() => setStub(null)} />}
    </MarketingShell>
  )
}
