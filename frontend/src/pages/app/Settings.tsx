import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TIER_META, useAuth } from '../../context/AuthContext'
import { openBillingPortal } from '../../lib/billing'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ICheck, ICode, ILock } from '../../components/icons'

const KEYS_STORE = 'tigbourne.apikeys'

interface ApiKey {
  id: string
  token: string
  created: string
}

function genToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `tig_live_${hex}`
}

function loadKeys(): ApiKey[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS_STORE) || '[]')
  } catch {
    return []
  }
}

export default function Settings() {
  useDocumentTitle('Settings')
  const { user, updateUser } = useAuth()
  const nav = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [org, setOrg] = useState(user?.org || '')
  const [savedFlash, setSavedFlash] = useState(false)
  const [keys, setKeys] = useState<ApiKey[]>(loadKeys)
  const [copied, setCopied] = useState<string | null>(null)
  const [modal, setModal] = useState<string | null>(null)

  const isEnterprise = user?.tier === 'Enterprise'
  const meta = user ? TIER_META[user.tier] : null

  useEffect(() => {
    localStorage.setItem(KEYS_STORE, JSON.stringify(keys))
  }, [keys])

  function saveProfile() {
    updateUser({ name: name.trim() || user?.name, org: org.trim() || user?.org })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  function addKey() {
    setKeys((k) => [{ id: crypto.randomUUID(), token: genToken(), created: new Date().toISOString().slice(0, 10) }, ...k])
  }
  function revoke(id: string) {
    setKeys((k) => k.filter((x) => x.id !== id))
  }
  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(token)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* ignore */
    }
  }

  async function manageBilling() {
    const res = await openBillingPortal()
    if (res.status === 'redirect' && res.url) window.location.href = res.url
    else setModal(res.message || 'Billing portal unavailable in this demo.')
  }

  const renewal = (() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  })()

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
      <p className="text-sm text-ink-muted">Manage your profile, subscription and API access.</p>

      {/* Profile */}
      <section className="mt-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-600">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-ink-soft">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft">Organization</label>
            <input value={org} onChange={(e) => setOrg(e.target.value)} className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-ink-soft">Work email</label>
            <input value={user?.email || ''} disabled className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-black/10 bg-black/[0.03] px-4 py-2.5 text-sm text-ink-muted outline-none" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveProfile} className="btn-dark !py-2.5">Save changes</button>
          {savedFlash && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <ICheck className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </section>

      {/* Billing */}
      <section className="mt-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-600">Subscription & billing</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#fafafa] p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-ink">{user?.tier}</span>
              <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-700">Active</span>
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">
              {meta?.price} <span className="text-ink-faint">{meta?.period}</span> · renews {renewal}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => nav('/pricing')} className="btn-ghost !py-2.5">Change plan</button>
            <button onClick={manageBilling} className="btn-dark !py-2.5">Manage billing</button>
          </div>
        </div>
      </section>

      {/* API keys */}
      <section className="mt-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-600">API keys</h2>
          {isEnterprise && (
            <button onClick={addKey} className="btn-dark !px-4 !py-2">Generate key</button>
          )}
        </div>

        {!isEnterprise ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold-200/70 bg-gold-50/40 p-4">
            <ILock className="h-5 w-5 shrink-0 text-gold-600" />
            <p className="text-sm text-ink-soft">
              Programmatic API access is an Enterprise feature.{' '}
              <button onClick={() => nav('/pricing')} className="font-semibold text-gold-600 hover:text-gold-700">
                Upgrade
              </button>{' '}
              to issue keys.
            </p>
          </div>
        ) : keys.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-black/[0.12] p-8 text-center">
            <ICode className="mx-auto h-6 w-6 text-ink-faint" />
            <p className="mt-2 text-sm text-ink-muted">No API keys yet. Generate one to start pulling formatted field data.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white p-3">
                <div className="min-w-0">
                  <code className="block truncate font-mono text-sm text-ink">{k.token}</code>
                  <span className="text-[11px] text-ink-faint">Created {k.created}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => copy(k.token)} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-black/[0.03]">
                    {copied === k.token ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={() => revoke(k.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 animate-fade-in" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-float animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ink">Billing portal</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{modal}</p>
            <button onClick={() => setModal(null)} className="btn-dark mt-5 w-full !py-3">Got it</button>
          </div>
        </div>
      )}
    </div>
  )
}
