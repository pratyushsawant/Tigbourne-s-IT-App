import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'

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

export interface AuthResult {
  ok: boolean
  error?: string
}

interface AuthState {
  user: User | null
  signOut: () => void
  updateUser: (partial: Partial<User>) => void
  can: (p: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)
const TIER_KEY = 'tigbourne.tier'

function deriveOrg(email: string): string {
  const domain = email.split('@')[1] || 'tigbourne.com'
  const base = domain.split('.')[0]
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function loadTier(): Tier {
  try {
    const saved = localStorage.getItem(TIER_KEY)
    if (saved && ['Individual', 'Institutional', 'Enterprise'].includes(saved)) return saved as Tier
  } catch {}
  return 'Enterprise'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, user: clerkUser, isLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const [tier, setTier] = useState<Tier>(loadTier)
  const [user, setUser] = useState<User | null>(null)

  // Hydrate our User from Clerk's session whenever it changes
  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || ''
      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        email.split('@')[0].replace(/[._-]+/g, ' ')
      const u: User = {
        email,
        name,
        org: deriveOrg(email),
        tier,
      }
      setUser(u)
    } else {
      setUser(null)
    }
  }, [isSignedIn, clerkUser, isLoaded, tier])

  const signOut = () => {
    setUser(null)
    localStorage.removeItem(TIER_KEY)
    clerkSignOut()
  }

  const updateUser = (partial: Partial<User>) => {
    if (partial.tier) {
      setTier(partial.tier)
      localStorage.setItem(TIER_KEY, partial.tier)
    }
    setUser((prev) => {
      if (!prev) return prev
      return { ...prev, ...partial }
    })
  }

  const can = (p: Permission) => (user ? tierCan(user.tier, p) : false)

  return (
    <AuthContext.Provider value={{ user, signOut, updateUser, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
