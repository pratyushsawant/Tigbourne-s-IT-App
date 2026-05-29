import type { ReactNode } from 'react'
import { MarketingShell } from '../components/MarketingShell'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <MarketingShell>
      <article className="container-x max-w-3xl py-16">
        <h1 className="text-4xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated {updated}</p>
        <div className="legal mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">{children}</div>
        <p className="mt-12 rounded-xl bg-gold-50 px-4 py-3 text-xs text-gold-700">
          Template language for the demo build — not legal advice. Final terms will be prepared with counsel before launch.
        </p>
      </article>
    </MarketingShell>
  )
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-ink">{children}</h2>
}

export function Terms() {
  useDocumentTitle('Terms of Service')
  return (
    <LegalShell title="Terms of Service" updated="May 2026">
      <H>1. Agreement</H>
      <p>These Terms govern access to the Tigbourne Oil Field Intelligence platform ("Service"). By creating an account or using the Service you agree to these Terms on behalf of your organization.</p>
      <H>2. Subscriptions & access tiers</H>
      <p>Access is licensed by subscription tier (Individual, Institutional, Enterprise). Features, seat counts and API access are determined by your active tier. Fees are billed annually in advance and are non-refundable except as required by law.</p>
      <H>3. Acceptable use</H>
      <p>You may not resell, redistribute, scrape, or sublicense the data or analysis except as expressly permitted by your contract. API keys are issued to your organization and may not be shared outside it. Usage is monitored for abuse.</p>
      <H>4. Data & confidentiality</H>
      <p>The dataset, analysis and economic models are Tigbourne Capital's confidential property, covered by the NDA and non-circumvention agreement. See our <a href="/nda" className="text-gold-600 hover:text-gold-700">NDA</a> and <a href="/privacy" className="text-gold-600 hover:text-gold-700">Privacy Policy</a>.</p>
      <H>5. No investment advice</H>
      <p>All valuations, NPV, break-even and CEOR outputs are screening estimates, not reserves-grade valuations or investment advice. You are responsible for your own diligence and decisions.</p>
      <H>6. Liability</H>
      <p>The Service is provided "as is." To the maximum extent permitted by law, Tigbourne's aggregate liability is limited to the fees paid in the prior twelve months.</p>
    </LegalShell>
  )
}

export function Privacy() {
  useDocumentTitle('Privacy Policy')
  return (
    <LegalShell title="Privacy Policy" updated="May 2026">
      <H>1. What we collect</H>
      <p>Account details (name, work email, organization), authentication data, and product usage (screens viewed, filters run, exports). We do not sell personal data.</p>
      <H>2. How we use it</H>
      <p>To provide and secure the Service, enforce subscription entitlements, improve the product, and communicate about your account. Billing is processed by Stripe; we never store full card details.</p>
      <H>3. Sharing</H>
      <p>We share data only with processors needed to run the Service (e.g. hosting, payments) under contract, or where required by law. Your screens, filters and exports are confidential to your organization.</p>
      <H>4. Security & retention</H>
      <p>Data is encrypted in transit and at rest, access is role-based and audited, and we retain account data for the life of the subscription plus any legally required period.</p>
      <H>5. Your rights</H>
      <p>You may request access, correction or deletion of your personal data via your account settings or by contacting us.</p>
    </LegalShell>
  )
}

export function NDA() {
  useDocumentTitle('NDA & Non-Circumvention')
  return (
    <LegalShell title="NDA & Non-Circumvention" updated="May 2026">
      <H>1. Confidential information</H>
      <p>All field data, parameters, economic models, methodologies, pricing and platform concepts disclosed through the Service are Confidential Information of Tigbourne Capital.</p>
      <H>2. Obligations</H>
      <p>You agree to keep Confidential Information secret, use it solely for evaluating fields within your organization, and not disclose it to third parties without written consent.</p>
      <H>3. Non-circumvention</H>
      <p>You agree not to bypass Tigbourne to transact directly with data sources, operators, or chemical suppliers introduced through the platform, nor to replicate the dataset for resale.</p>
      <H>4. Term</H>
      <p>These obligations survive termination of your subscription and remain in effect for the period specified in your signed agreement with Tigbourne Capital.</p>
    </LegalShell>
  )
}
