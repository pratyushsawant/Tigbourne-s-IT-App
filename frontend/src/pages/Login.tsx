import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets, ArrowRight } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Placeholder auth — will connect to FastAPI JWT endpoint
    if (!email || !password) {
      setError('Enter email and password')
      return
    }
    localStorage.setItem(
      'tc_user',
      JSON.stringify({ email, name: email.split('@')[0], role: 'admin' })
    )
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[480px] bg-surface-1 border-r border-border flex-col justify-between p-10">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <Droplets size={28} className="text-accent" />
            <span className="text-lg font-semibold text-text-primary tracking-tight">
              Tigbourne Capital
            </span>
          </div>
          <h1 className="text-[32px] font-semibold text-text-primary leading-tight tracking-tight mb-4">
            Oil Field Data Platform
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed max-w-[340px]">
            Screen any oil field globally. Filter by production, reservoir conditions, and costs.
            Export analysis in CSV, PDF, or DOCX.
          </p>
        </div>
        <div className="text-[11px] text-text-muted">
          Confidential. Access restricted to authorized personnel.
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <Droplets size={24} className="text-accent" />
            <span className="text-base font-semibold text-text-primary">Tigbourne Capital</span>
          </div>

          <h2 className="text-xl font-semibold text-text-primary mb-1">Sign in</h2>
          <p className="text-sm text-text-secondary mb-8">
            Access the oil field data platform
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@tigbourne.com"
                className="w-full bg-surface-1 border border-border text-text-primary text-sm px-3 py-2.5 focus:outline-none focus:border-accent placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Enter password"
                className="w-full bg-surface-1 border border-border text-text-primary text-sm px-3 py-2.5 focus:outline-none focus:border-accent placeholder:text-text-muted"
              />
            </div>

            {error && (
              <div className="text-xs text-red">{error}</div>
            )}

            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-bright text-surface-0 text-sm font-medium py-2.5 transition-colors mt-2 cursor-pointer"
            >
              Sign In
              <ArrowRight size={14} />
            </button>
          </form>

          <p className="text-[11px] text-text-muted mt-6 text-center">
            Contact your administrator for access credentials
          </p>
        </div>
      </div>
    </div>
  )
}
