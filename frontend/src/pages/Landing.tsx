import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Logo } from '../components/Logo'
import { Globe } from '../components/Globe'
import { FIELDS, REGIONS, type OilField } from '../lib/fields'
import {
  IArrow,
  IBolt,
  IChart,
  ICheck,
  ICode,
  IExport,
  IFilter,
  IGlobe,
  ILayers,
  ILock,
  IShield,
} from '../components/icons'

const COUNTRIES = new Set(FIELDS.map((f) => f.country)).size
const OPERATORS = new Set(FIELDS.map((f) => f.operator)).size

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on)
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-black/[0.06] bg-white/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
          <a href="#platform" className="transition hover:text-ink">Platform</a>
          <a href="#data" className="transition hover:text-ink">The Data</a>
          <a href="#buyers" className="transition hover:text-ink">Who Uses It</a>
          <Link to="/pricing" className="transition hover:text-ink">Pricing</Link>
          <a href="#enterprise" className="transition hover:text-ink">Enterprise</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/signin" className="hidden text-sm font-semibold text-ink-soft transition hover:text-ink sm:block">
            Sign in
          </Link>
          <Link to="/signin" className="btn-gold !px-5 !py-2.5">
            Request access
          </Link>
        </div>
      </div>
    </header>
  )
}

/** Smoothly tween an integer toward `target` whenever it changes. */
function useCountUp(target: number, ms = 700) {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(from + (target - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return val
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="grid-faint grid-pan absolute inset-0 [mask-image:radial-gradient(80%_70%_at_50%_30%,#000_30%,transparent_80%)]" />
      {/* drifting gold orbs */}
      <div className="animate-blob absolute -top-32 left-[16%] h-[420px] w-[420px] rounded-full bg-gold-200/40 blur-[120px]" />
      <div className="animate-blob-slow absolute top-10 right-[10%] h-[360px] w-[360px] rounded-full bg-gold-300/25 blur-[130px]" />
      {/* rotating dotted globe — the field constellation */}
      <div className="absolute left-1/2 top-[46%] h-[min(86vw,820px)] w-[min(86vw,820px)] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,#000_72%,transparent_100%)]">
        <Globe className="h-full w-full" />
      </div>
      {/* legibility scrim behind the headline */}
      <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(58%_68%_at_50%_26%,rgba(255,255,255,0.7),rgba(255,255,255,0)_72%)]" />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
      <HeroBackdrop />
      <div className="container-x relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-gold-300/60 bg-gold-50/80 px-3.5 py-1.5 text-xs font-semibold text-gold-700 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-500" />
            Tigbourne Capital · Oil Field Intelligence
          </span>
          <h1 className="animate-fade-up mt-6 text-[clamp(2.6rem,6vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink">
            Screen every oil field
            <br />
            on earth. <span className="text-shimmer-gold">In seconds.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted [animation-delay:80ms]">
            The only platform that pairs field-level production and reservoir data with chemical-recovery
            economics. Filter {FIELDS.length.toLocaleString()} fields by the parameters that matter — then export
            institutional-grade analysis.
          </p>
          <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:160ms]">
            <Link to="/signin" className="btn-gold group w-full sm:w-auto">
              Enter the platform
              <IArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#platform" className="btn-ghost w-full sm:w-auto">
              See how it works
            </a>
          </div>
          <p className="animate-fade-in mt-5 text-xs text-ink-faint [animation-delay:240ms]">
            Trusted for diligence by investment banks, operators, and chemical majors.
          </p>
        </div>

        <LiveDemo />
      </div>
    </section>
  )
}

interface Scenario {
  chips: string[]
  match: (f: OilField) => boolean
}

const SCENARIOS: Scenario[] = [
  {
    chips: ['Water cut ≤ 40%', 'API 16–40°', 'Offshore'],
    match: (f) => f.waterCut != null && f.waterCut <= 40 && f.api != null && f.api >= 16 && f.api <= 40 && f.shore === 'Offshore',
  },
  {
    chips: ['Onshore', 'BHT < 130°C', 'Sweet spot'],
    match: (f) => f.shore === 'Onshore' && f.bht != null && f.bht < 130 && f.api != null && f.api >= 16 && f.api <= 40,
  },
  {
    chips: ['Middle East', 'Lift < $15/bbl'],
    match: (f) => f.region === 'Middle East' && f.liftCost != null && f.liftCost < 15,
  },
  {
    chips: ['LATAM', 'Offshore', 'API ≥ 28°'],
    match: (f) => f.region === 'LATAM' && f.shore === 'Offshore' && f.api != null && f.api >= 28,
  },
]

function LiveDemo() {
  const computed = useMemo(
    () =>
      SCENARIOS.map((s) => {
        const matches = FIELDS.filter(s.match)
        const rows = matches
          .filter((f) => f.oilBblPerDay)
          .sort((a, b) => (b.oilBblPerDay || 0) - (a.oilBblPerDay || 0))
          .slice(0, 6)
        return { chips: s.chips, count: matches.length, rows }
      }),
    [],
  )

  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIdx((i) => (i + 1) % computed.length), 3400)
    return () => clearInterval(t)
  }, [paused, computed.length])

  const scene = computed[idx]
  const count = useCountUp(scene.count)
  const rows = [...scene.rows]
  while (rows.length < 6) rows.push(null as unknown as OilField)

  return (
    <div
      className="animate-fade-up relative mx-auto mt-16 max-w-5xl [animation-delay:260ms]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-float">
        <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f7f7f8] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#e2e2e6]" />
          <span className="h-3 w-3 rounded-full bg-[#e2e2e6]" />
          <span className="ml-3 text-xs font-medium text-ink-faint">app.tigbourne.com — Field Explorer</span>
          <span className="ml-auto hidden items-center gap-1.5 text-[10px] font-medium text-emerald-600 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            live
          </span>
        </div>
        <div className="grid grid-cols-1 text-left sm:grid-cols-[180px_1fr]">
          <div className="hidden border-r border-black/[0.06] bg-[#fafafa] p-4 sm:block">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Filters</p>
            <div key={idx} className="mt-2 space-y-2">
              {scene.chips.map((c, i) => (
                <div
                  key={c}
                  className="animate-fade-up flex items-center gap-2 rounded-lg bg-gold-50 px-2.5 py-1.5 text-[11px] font-medium text-gold-700"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                  {c}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-black/[0.06] bg-white p-3">
              <p className="text-[10px] text-ink-faint">Matching</p>
              <p className="text-xl font-semibold tabular-nums text-ink">{count.toLocaleString()}</p>
              <p className="text-[10px] text-ink-faint">fields</p>
            </div>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-black/[0.06] text-left text-ink-faint">
                  <th className="px-3 py-2 font-medium">Field</th>
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 text-right font-medium">Oil bbl/d</th>
                  <th className="px-3 py-2 text-right font-medium">W-Cut</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">API</th>
                </tr>
              </thead>
              <tbody key={idx}>
                {rows.map((f, i) =>
                  f ? (
                    <tr
                      key={f.id}
                      className={`animate-fade-up border-b border-black/[0.03] ${i === 0 ? 'bg-gold-50/60' : i % 2 ? 'bg-[#fbf7ed]/30' : ''}`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <td className="px-3 py-2 font-medium text-ink">{f.oilfield}</td>
                      <td className="px-3 py-2 text-ink-muted">{f.country}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{(f.oilBblPerDay || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{f.waterCut}%</td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-ink-muted sm:table-cell">{f.api}°</td>
                    </tr>
                  ) : (
                    <tr key={`pad-${i}`} className="border-b border-black/[0.03]">
                      <td className="px-3 py-2" colSpan={5}>
                        &nbsp;
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* scenario progress dots */}
        <div className="flex items-center justify-center gap-1.5 border-t border-black/[0.06] py-2.5">
          {computed.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-gold-500' : 'w-1.5 bg-black/15 hover:bg-black/30'}`}
              aria-label={`Show scenario ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-6 left-1/2 h-12 w-3/4 -translate-x-1/2 rounded-full bg-gold-300/30 blur-2xl" />
    </div>
  )
}

function Stats() {
  const items = [
    { v: FIELDS.length.toLocaleString(), l: 'Oil fields tracked' },
    { v: COUNTRIES.toString(), l: 'Countries covered' },
    { v: OPERATORS.toLocaleString(), l: 'Operators profiled' },
    { v: REGIONS.length.toString(), l: 'Global regions' },
  ]
  return (
    <section className="border-y border-black/[0.06] bg-[#fafafa]">
      <div className="container-x grid grid-cols-2 gap-px py-10 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.l} className="px-4 text-center">
            <div className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{it.v}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-faint">{it.l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: IFilter,
    title: 'Multi-parameter screening',
    body: 'Filter on water cut, API gravity, reservoir temperature, lifting cost, depth and more — across every region simultaneously.',
  },
  {
    icon: ILayers,
    title: 'Field + chemical economics',
    body: 'The combination no competitor has: production characteristics alongside the inputs that drive chemical-recovery viability.',
  },
  {
    icon: IExport,
    title: 'Export in one click',
    body: 'Take any filtered result set to CSV, PDF, or Word — formatted, branded, and ready for the deal room.',
  },
  {
    icon: IChart,
    title: 'Visual intelligence',
    body: 'Break-even, water-cut intervention curves and regional distributions rendered the moment you filter.',
  },
  {
    icon: IBolt,
    title: 'Constantly updated',
    body: 'Three-plus years of accumulated field data, refreshed continuously — the moat subscribers pay to stay inside of.',
  },
  {
    icon: ICode,
    title: 'API-first',
    body: 'Every screen is backed by a documented API. Pull formatted, current field data straight into your own models.',
  },
]

function Features() {
  return (
    <section id="platform" className="py-24">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-gold-600">The platform</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-ink">
            Everything you need to value a field — in one screen.
          </h2>
          <p className="mt-4 text-lg text-ink-muted">
            Built for the analysts who can't afford to approach a field blind.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card group p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold-600 ring-1 ring-gold-200/60 transition group-hover:bg-gold-100">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const DATA_ROWS = [
  ['Production', 'Oil, water & total liquid per day · water cut · decline rate', 'How far the field has declined and how much oil remains'],
  ['Reservoir', 'API gravity · temperature · salinity · porosity · permeability', 'Determines which recovery chemicals actually work'],
  ['Location', 'Onshore / offshore · depth · operator · country', 'Offshore economics differ entirely — depth changes everything'],
  ['Cost', 'Lifting · transport · drilling & completion · P&A estimates', 'The core inputs to every break-even and NPV calculation'],
]

function DataSection() {
  return (
    <section id="data" className="relative overflow-hidden bg-ink py-24 text-white">
      <div className="absolute inset-0 glow-gold" />
      <div className="container-x relative">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold text-gold-400">The data we sell</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.02em]">
              The moat is the dataset.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              The four largest energy-data firms cover 80,000+ fields — but none combine field-level
              characteristics with chemical-recovery economics. We do. It can't be replicated quickly.
            </p>
            <div className="mt-8 space-y-3">
              {[
                'Not sold as raw files — delivered as abstracted analysis and API access',
                'Recovery economics most providers ignore entirely',
                'P&A cost estimates included — a key valuation differentiator',
              ].map((t) => (
                <div key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-400">
                    <ICheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-white/80">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {DATA_ROWS.map(([cat, what, why]) => (
              <div key={cat} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-gold-400/40 hover:bg-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-gold-500/15 px-2.5 py-1 text-xs font-semibold text-gold-400">{cat}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-white">{what}</p>
                <p className="mt-1 text-xs text-white/55">{why}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const BUYERS = [
  { who: 'Chemical companies', need: 'Know which fields match their chemicals — instead of approaching operators blind.', eg: 'Dow · BASF · SNF · Huntsman' },
  { who: 'Oilfield services', need: 'Targeting data for chemical-recovery product lines.', eg: 'SLB · Baker Hughes · Halliburton' },
  { who: 'Investment banks', need: 'Independent valuation of a field before and after chemical recovery.', eg: 'UBS · Capital One' },
  { who: 'Oil operators', need: 'Chemicals, a new well, or sell? With hard numbers.', eg: 'ExxonMobil · Chevron · EGPC' },
  { who: 'PE & funds', need: 'Pre-screened fields ranked by recovery economics.', eg: 'Tigbourne & comparable firms' },
]

function Buyers() {
  return (
    <section id="buyers" className="py-24">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-gold-600">Who uses it</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-ink">
            Built for Fortune 500 decision-makers.
          </h2>
          <p className="mt-4 text-lg text-ink-muted">
            Five buyer types, one source of truth on what a field is really worth.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BUYERS.map((b) => (
            <div key={b.who} className="card flex flex-col p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
              <h3 className="text-lg font-semibold text-ink">{b.who}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{b.need}</p>
              <p className="mt-5 border-t border-black/[0.06] pt-4 text-xs font-medium text-gold-600">{b.eg}</p>
            </div>
          ))}
          <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-gold-500 to-gold-700 p-7 text-white shadow-gold">
            <IGlobe className="h-7 w-7" />
            <h3 className="mt-4 text-lg font-semibold">Your firm next.</h3>
            <p className="mt-2 text-sm text-white/85">Request access and we'll tailor a dataset to your mandate.</p>
            <Link to="/signin" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
              Get started <IArrow className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Enterprise() {
  const items = [
    { icon: IShield, t: 'Enterprise security', d: 'JWT-secured sessions, role-based permission tiers, and audited access. SOC 2 on the roadmap.' },
    { icon: ILock, t: 'NDA-grade confidentiality', d: 'Every dataset is governed by non-circumvention terms. Your screens stay yours.' },
    { icon: IBolt, t: 'Sub-second filtering', d: `Query across all ${FIELDS.length.toLocaleString()} fields with indexed, cached responses — no spinners.` },
  ]
  return (
    <section id="enterprise" className="border-t border-black/[0.06] bg-[#fafafa] py-24">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.t}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gold-600 shadow-card ring-1 ring-black/[0.04]">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-ink">{it.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center sm:px-16">
          <div className="absolute inset-0 glow-gold" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
              See what your next field is worth.
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Enter the platform and screen {FIELDS.length.toLocaleString()} fields in seconds.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/signin" className="btn-gold w-full sm:w-auto">Enter the platform</Link>
              <Link to="/signin" className="btn-ghost w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto">
                Request enterprise access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-black/[0.06] py-12">
      <div className="container-x flex flex-col items-center justify-between gap-6 sm:flex-row">
        <Logo />
        <p className="text-xs text-ink-faint">
          © {new Date().getFullYear()} Tigbourne Capital. Confidential — covered by NDA & non-circumvention agreement.
        </p>
        <div className="flex flex-wrap justify-center gap-5 text-xs font-medium text-ink-muted">
          <Link to="/pricing" className="hover:text-ink">Pricing</Link>
          <Link to="/terms" className="hover:text-ink">Terms</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <Link to="/nda" className="hover:text-ink">NDA</Link>
          <Link to="/signin" className="hover:text-ink">Sign in</Link>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="bg-white">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <DataSection />
        <Buyers />
        <Enterprise />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
