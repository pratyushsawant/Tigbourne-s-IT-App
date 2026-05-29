import { TIER_META, type Tier } from '../context/AuthContext'

/**
 * Billing entrypoints. Real payments require the backend (Stripe secret key + webhooks),
 * so these call stubbed endpoints and degrade gracefully when none responds. When the
 * FastAPI backend is live, implement:
 *   POST /api/billing/checkout  -> { url } (Stripe Checkout Session)
 *   POST /api/billing/portal    -> { url } (Stripe Customer Portal)
 *   webhook checkout.session.completed -> set the user's tier
 * Only the publishable key ever touches the frontend.
 */

export type CheckoutStatus = 'redirect' | 'contact' | 'stub'
export interface CheckoutResult {
  status: CheckoutStatus
  url?: string
  message?: string
}

const STUB_MESSAGE =
  'Checkout is wired and ready for Stripe — the backend billing endpoint just isn’t live in this demo build yet. In production this opens Stripe Checkout.'

async function post(path: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { url?: string }
    return data.url ?? null
  } catch {
    return null
  }
}

/** Begin a subscription. Self-serve tiers → Stripe Checkout; Enterprise → Contact Sales. */
export async function startCheckout(tier: Tier): Promise<CheckoutResult> {
  if (TIER_META[tier].cta === 'sales') return { status: 'contact' }
  const url = await post('/api/billing/checkout', { tier })
  if (url) return { status: 'redirect', url }
  return { status: 'stub', message: STUB_MESSAGE }
}

/** Open the Stripe Customer Portal to manage an existing subscription. */
export async function openBillingPortal(): Promise<CheckoutResult> {
  const url = await post('/api/billing/portal')
  if (url) return { status: 'redirect', url }
  return { status: 'stub', message: STUB_MESSAGE }
}
