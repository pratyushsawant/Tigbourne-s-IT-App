import { createContext, useContext, useState, type ReactNode } from 'react'

export type Tier = 'Individual' | 'Institutional' | 'Enterprise'
export type Permission = 'economics' | 'export' | 'dataIntegrity'

export interface User {
  email: string
  name: string
  org: string
  tier: Tier
}

/** What each subscription tier is allowed to do (frontend gating — backend enforces for real). */
const PERMISSIONS: Record<Tier, Permission[]> = {
  Individual: [],
  Institutional: ['economics', 'export'],
  Enterprise: ['economics', 'export', 'dataIntegrity'],
}

export const TIERS: Tier[] = ['Individual', 'Institutional', 'Enterprise']

export interface TierMeta {
  blurb: string
  perks: string[]
  price: string // headline price
  period: string // e.g. '/seat / year'
  priceNote?: string
  cta: 'self' | 'sales' // self-serve checkout vs. contact sales
  highlight?: boolean
}

export const TIER_META: Record<Tier, TierMeta> = {
  Individual: {
    blurb: 'Browse and screen the full field database.',
    perks: ['Field explorer & filters', 'Field parameter detail', 'Analytics dashboards', '1 seat'],
    price: '$6,000',
    period: '/ seat / year',
    priceNote: 'Billed annually',
    cta: 'self',
  },
  Institutional: {
    blurb: 'Everything in Individual, plus economics and export.',
    perks: [
      'Everything in Individual',
      'CEOR & NPV economics',
      'Break-even & intervention curves',
      'CSV · PDF · Word export',
      'Up to 5 seats',
    ],
    price: '$36,000',
    period: '/ year',
    priceNote: 'Up to 5 seats, billed annually',
    cta: 'self',
    highlight: true,
  },
  Enterprise: {
    blurb: 'Full platform access for the whole desk.',
    perks: [
      'Everything in Institutional',
      'Unlimited seats',
      'Data-integrity & audit log',
      'API access & keys',
      'SSO & dedicated support',
    ],
    price: 'From $120,000',
    period: '/ year',
    priceNote: 'Custom contract · annual invoice',
    cta: 'sales',
  },
}

export function tierCan(tier: Tier, p: Permission): boolean {
  return PERMISSIONS[tier].includes(p)
}

interface AuthState {
  user: User | null
  signIn: (email: string, opts?: Partial<User>) => void
  signOut: () => void
  updateUser: (partial: Partial<User>) => void
  can: (p: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)
const KEY = 'tigbourne.session'

function deriveOrg(email: string): string {
  const domain = email.split('@')[1] || 'tigbourne.com'
  const base = domain.split('.')[0]
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function loadSession(): User | null {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? (JSON.parse(saved) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read synchronously on first render so a hard reload of /app keeps the session.
  const [user, setUser] = useState<User | null>(loadSession)

  const signIn: AuthState['signIn'] = (email, opts) => {
    const namePart = email.split('@')[0].replace(/[._-]+/g, ' ')
    const name =
      opts?.name ||
      namePart
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    const u: User = {
      email,
      name: name || 'Analyst',
      org: opts?.org || deriveOrg(email),
      tier: opts?.tier || 'Enterprise',
    }
    setUser(u)
    localStorage.setItem(KEY, JSON.stringify(u))
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem(KEY)
  }

  const updateUser: AuthState['updateUser'] = (partial) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }

  const can = (p: Permission) => (user ? tierCan(user.tier, p) : false)

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, updateUser, can }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
