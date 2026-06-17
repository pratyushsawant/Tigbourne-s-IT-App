import { SignIn as ClerkSignIn, SignUp as ClerkSignUp } from '@clerk/clerk-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { FIELDS } from '../lib/fields'
import { ICheck } from '../components/icons'

const COUNTRIES = new Set(FIELDS.map((f) => f.country)).size

export default function SignIn() {
  useDocumentTitle('Sign in')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
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

      {/* Right — Clerk auth */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="lg:hidden mb-8">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        {isSignup ? (
          <ClerkSignUp
            routing="hash"
            afterSignUpUrl="/app"
            appearance={{
              elements: {
                rootBox: 'w-full max-w-sm',
                card: 'shadow-none border-none bg-transparent',
                headerTitle: 'text-ink font-semibold',
                headerSubtitle: 'text-ink-muted',
                formButtonPrimary: 'bg-ink hover:bg-black text-white rounded-full',
                footerActionLink: 'text-gold-600 hover:text-gold-700',
              },
            }}
          />
        ) : (
          <ClerkSignIn
            routing="hash"
            afterSignInUrl="/app"
            appearance={{
              elements: {
                rootBox: 'w-full max-w-sm',
                card: 'shadow-none border-none bg-transparent',
                headerTitle: 'text-ink font-semibold',
                headerSubtitle: 'text-ink-muted',
                formButtonPrimary: 'bg-ink hover:bg-black text-white rounded-full',
                footerActionLink: 'text-gold-600 hover:text-gold-700',
              },
            }}
          />
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
      </div>
    </div>
  )
}
