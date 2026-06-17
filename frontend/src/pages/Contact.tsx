import { useState, type FormEvent } from 'react'
import { MarketingShell } from '../components/MarketingShell'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { ICheck } from '../components/icons'

export default function Contact() {
  useDocumentTitle('Contact Sales', 'Request an Enterprise quote for the Tigbourne Oil Field Intelligence platform.')
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', org: '', seats: '', message: '' })

  function submit(e: FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  const field = (k: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="text-xs font-semibold text-ink-soft">{label}</label>
      <input
        type={type}
        value={form[k]}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
        placeholder={placeholder}
        required={k !== 'seats' && k !== 'message'}
        className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100"
      />
    </div>
  )

  return (
    <MarketingShell>
      <section className="py-20">
        <div className="container-x">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.02em] text-ink">Talk to our team</h1>
              <p className="mt-4 text-lg text-ink-muted">
                Enterprise plans are tailored to your mandate — seats, API volume, regions and
                support. Tell us a little and we'll prepare a quote and a pilot.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  'Custom dataset scoped to your basins',
                  '14-day pilot on a region of your choice',
                  'API access & dedicated onboarding',
                  'Annual contract, invoiced',
                ].map((t) => (
                  <div key={t} className="flex items-center gap-3 text-sm text-ink-soft">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                      <ICheck className="h-3 w-3" />
                    </span>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-7">
              {sent ? (
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-100 text-gold-700">
                    <ICheck className="h-7 w-7" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-ink">Thanks, {form.name.split(' ')[0] || 'there'}.</h2>
                  <p className="mt-2 max-w-sm text-sm text-ink-muted">
                    Our team will reach out to <span className="font-medium text-ink">{form.email}</span> within one
                    business day to scope a quote and pilot.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  {field('name', 'Full name', 'text', 'Jordan Avery')}
                  {field('email', 'Work email', 'email', 'you@company.com')}
                  {field('org', 'Organization', 'text', 'UBS')}
                  {field('seats', 'Approx. seats needed', 'text', 'e.g. 20')}
                  <div>
                    <label className="text-xs font-semibold text-ink-soft">What are you trying to value?</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      rows={3}
                      placeholder="Regions, use case, timeline…"
                      className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100"
                    />
                  </div>
                  <button type="submit" className="btn-dark w-full !py-3.5">
                    Request a quote
                  </button>
                  <p className="text-center text-[11px] text-ink-faint">
                    Demo build — this form is illustrative and doesn't send email yet.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
