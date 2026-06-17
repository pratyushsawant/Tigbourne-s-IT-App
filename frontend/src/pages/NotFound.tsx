import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { IArrow } from '../components/icons'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="container-x flex h-16 items-center">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <div className="absolute -top-20 left-1/2 h-[360px] w-[600px] -translate-x-1/2 rounded-full bg-gold-200/30 blur-[120px]" />
        <div className="relative text-center">
          <p className="text-7xl font-semibold tracking-tight text-gradient-gold">404</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">This well came up dry.</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            The page you're looking for doesn't exist or may have moved.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <Link to="/" className="btn-dark">
              Back to home
            </Link>
            <Link to="/app" className="btn-dark">
              Open the platform <IArrow className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
