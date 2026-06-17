import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Logo } from './Logo'

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-ink-soft">
            <Link to="/" className="hidden transition hover:text-ink sm:block">
              Platform
            </Link>
            <Link to="/pricing" className="hidden transition hover:text-ink sm:block">
              Pricing
            </Link>
            <Link to="/signin" className="transition hover:text-ink">
              Sign in
            </Link>
            <Link to="/signin" className="btn-dark !px-5 !py-2.5">
              Request access
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/[0.06] py-12">
      <div className="container-x flex flex-col items-center justify-between gap-6 sm:flex-row">
        <Logo />
        <p className="text-xs text-ink-faint">
          © {new Date().getFullYear()} Tigbourne Capital. Confidential — covered by NDA &
          non-circumvention agreement.
        </p>
        <div className="flex flex-wrap justify-center gap-5 text-xs font-medium text-ink-muted">
          <Link to="/pricing" className="hover:text-ink">
            Pricing
          </Link>
          <Link to="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link to="/nda" className="hover:text-ink">
            NDA
          </Link>
        </div>
      </div>
    </footer>
  )
}
