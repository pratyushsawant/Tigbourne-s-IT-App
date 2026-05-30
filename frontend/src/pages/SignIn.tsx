import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { TIER_META, TIERS, useAuth, type Tier } from '../context/AuthContext'
import { Logo } from '../components/Logo'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { FIELDS } from '../lib/fields'
import { IArrow, ICheck, ILock } from '../components/icons'

const COUNTRIES = new Set(FIELDS.map((f) => f.country)).size

export default function SignIn() {
  useDocumentTitle('Sign in')
  const { signIn, login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string })?.from || '/app'

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [org, setOrg] = useState('')
  const [tier, setTier] = useState<Tier>('Enterprise')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setError('')
    setLoading(true)
    // Uses the real API when VITE_API_BASE is set; falls back to mock auth otherwise.
    const res =
      mode === 'signup'
        ? await register({ email, password, name: name || undefined, org: org || undefined, tier })
        : await login(email, password)
    setLoading(false)
    if (res.ok) nav(from, { replace: true })
    else setError(res.error || 'Something went wrong. Please try again.')
  }

  function demo() {
    setLoading(true)
    setTimeout(() => {
      signIn('analyst@ubs.com', { name: 'Jordan Avery', org: 'UBS', tier: 'Enterprise' })
      nav('/app', { replace: true })
    }, 450)
  }

  const isSignup = mode === 'signup'

  return (
    <div className="flex min-h-screen">
      {/* Left — brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 glow-gold" />
        <div className="absolute inset-0 grid-faint opacity-[0.15]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/">
            <Logo tone="light" />
          </Link>
          <div className="max-w-md">
            <h2 className="text-4xl font-semibold leading-tight tracking-[-0.02em]">
              The world's oil fields, <span className="text-gradient-gold">priced.</span>
            </h2>
            <p className="mt-4 text-white/70">
              {isSignup
                ? `Create an account to screen ${FIELDS.length.toLocaleString()} fields across ${COUNTRIES} countries.`
                : `Sign in to screen ${FIELDS.length.toLocaleString()} fields across ${COUNTRIES} countries — and export institutional-grade analysis in a click.`}
            </p>
            <div className="mt-8 space-y-3">
              {['Multi-parameter field screening', 'Chemical-recovery economics', 'CSV · PDF · Word export'].map((t) => (
                <div key={t} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-500/20 text-gold-400">
                    <ICheck className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/40">
            Confidential — covered by the Tigbourne Capital NDA & non-circumvention agreement.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <div className="mt-8 lg:mt-0">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {isSignup ? 'Create your account' : 'Sign in'}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {isSignup
                ? 'Choose your access tier — you can change it anytime in the demo.'
                : 'Welcome back. Enter your enterprise credentials to access the platform.'}
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {isSignup && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-soft">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Avery"
                    className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-soft">Organization</label>
                  <input
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder="UBS"
                    className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-ink-soft">Work email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink-soft">Password</label>
                {!isSignup && (
                  <a href="#" className="text-xs font-medium text-gold-600 hover:text-gold-700">
                    Forgot?
                  </a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100"
              />
            </div>

            {isSignup && (
              <div>
                <label className="text-xs font-semibold text-ink-soft">Access tier</label>
                <div className="mt-2 space-y-2">
                  {TIERS.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTier(t)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                        tier === t ? 'border-gold-400 bg-gold-50 ring-2 ring-gold-100' : 'border-black/10 hover:border-gold-300'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          tier === t ? 'border-gold-500 bg-gold-500 text-white' : 'border-black/20'
                        }`}
                      >
                        {tier === t && <ICheck className="h-2.5 w-2.5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{t}</span>
                        <span className="block text-xs text-ink-muted">{TIER_META[t].blurb}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-center text-xs font-medium text-rose-600">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full !py-3.5 disabled:opacity-70">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {isSignup ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : (
                <>
                  {isSignup ? 'Create account' : 'Sign in'} <IArrow className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {!isSignup && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-black/10" />
                or
                <span className="h-px flex-1 bg-black/10" />
              </div>
              <button onClick={demo} disabled={loading} className="btn-ghost w-full !py-3.5">
                <ILock className="h-4 w-4 text-gold-600" />
                Continue with demo account
              </button>
            </>
          )}

          <p className="mt-6 text-center text-xs text-ink-faint">
            {isSignup ? 'Already have an account?' : 'No account?'}{' '}
            <button
              onClick={() => setMode(isSignup ? 'signin' : 'signup')}
              className="font-semibold text-gold-600 hover:text-gold-700"
            >
              {isSignup ? 'Sign in' : 'Request enterprise access'}
            </button>
          </p>
          <p className="mt-3 rounded-lg bg-gold-50 px-3 py-2 text-center text-[11px] text-gold-700">
            Demo build — any email & password will {isSignup ? 'create an account' : 'sign you in'}.
          </p>
        </div>
      </div>
    </div>
  )
}
