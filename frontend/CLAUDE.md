# CLAUDE.md — Tigbourne Oil Field Intelligence (frontend)

Guidance for Claude and the team when working in this repo. **Confidential** — all code,
data, and the economic model are covered by the Tigbourne Capital NDA & non-circumvention
agreement. Do not paste the dataset or model into public tools.

## What this is
An enterprise SaaS frontend for screening global oil fields and valuing chemical-enhanced oil
recovery (CEOR). Oil companies, banks, and chemical suppliers filter fields by parameters, view
per-field economics, and export analysis. Built to be sold to Fortune 500/1000 buyers.

## Stack
- **Vite + React 18 + TypeScript + Tailwind CSS 3**; React Router 6; Recharts for charts.
- No backend yet — data is bundled JSON. Auth is mock (localStorage); billing is stubbed for Stripe.
- State: React Context only (`AuthContext`). No Redux/Zustand.

## Commands
- `npm run dev` — dev server on :5173
- `npm run build` — `tsc -b` typecheck + Vite production build (must stay green)
- `npm run test` — Vitest unit tests (run before every PR)
- `npm run test:watch` — Vitest in watch mode

## Project structure
- `src/lib/fields.ts` — typed dataset (`FIELDS`), column metadata (`COLUMNS`), formatting, ranges.
- `src/lib/economics.ts` — the DCF / CEOR / break-even / drill-vs-CEOR engine. **Pure functions.**
- `src/lib/integrity.ts` — data-quality (audit log + mismatches) derived from `src/data/integrity.json`.
- `src/lib/prices.ts` — live-price hook with reference fallback.
- `src/lib/billing.ts` — Stripe-ready checkout entrypoints (stubbed until backend exists).
- `src/context/AuthContext.tsx` — mock auth, permission tiers, `can(permission)` gating.
- `src/pages/**` — marketing (Landing, Pricing, Contact, Legal), auth (SignIn), app (Dashboard,
  Explorer, FieldDetail, Analytics, Integrity, Settings).
- `src/data/fields.json`, `src/data/integrity.json` — generated from the source Excel (see below).

## Data pipeline (source of truth = the Excel dataset)
`src/data/fields.json` is **generated**, not hand-edited. It is extracted from the FINAL Oilfields
Dataset `.xlsx` (6 region sheets: Asia, Middle East, Africa, Europe, North America, LATAM) with
these normalizations, which MUST be preserved if you regenerate:
- Water cut: stored as a fraction (`0.43`) on most sheets but as whole percent (`97`) on parts of
  Asia — values `<= 1` are multiplied by 100 so everything is a percentage 0–100.
- Shore: `On/ON` → `Onshore`, `Off/OFF` → `Offshore`; `Both` is a real value kept verbatim.
- P&A: real `P&A ($)` column; missing on a couple of non-producing exploration wells.
`src/data/integrity.json` carries the Excel's Audit Log + Mismatches sheets. The Mismatches
`|Diff| %` column is a **ratio** (Diff ÷ Expected; `1.0` = 100%) — `integrity.ts` multiplies by 100
to display a true percentage. Do not double-convert.

## Conventions
- **Colors:** white + gold. Use the Tailwind tokens (`gold-*`, `ink`, `ink-soft`, `ink-muted`,
  `ink-faint`) and component classes (`btn-gold`, `btn-dark`, `btn-ghost`, `card`, `container-x`).
  Aesthetic target: Apple-clean + Claude-warm. No new accent colors without reason.
- **Gating:** never show tier-locked features by checking the tier string directly — use
  `useAuth().can('economics' | 'export' | 'dataIntegrity')`. Tier→permission map lives in `AuthContext`.
- **Economics are pure functions** in `economics.ts` — keep them framework-free and deterministic so
  they stay testable and can move server-side unchanged.
- **Money/labels:** use `usdCompact` (economics) / the column `format`s (fields). Always label
  estimates as screening estimates, never "valuation" or "advice".

## Testing rules (agreed in team meeting — prevent fake or meaningless tests)
Tests exist to catch regressions in real behavior. A test that can't fail for a real bug is worse
than no test. Follow these rules:
1. **Test behavior and math, not implementation details.** Assert on outputs/invariants
   (e.g. "break-even price equals lifting cost when there is no chemical opex"), not on private
   internals or call counts.
2. **No tautologies / no mocking the thing under test.** Don't mock `economics.ts` to test
   `economics.ts`. Feed real field inputs and assert the real result.
3. **Assert specific values or invariants**, not just "truthy"/"renders without crashing".
   Prefer exact numbers, ranges, ordering, and monotonicity (e.g. higher oil price ⇒ higher NPV).
4. **Cover edge cases that exist in the data**: missing production, missing P&A, the `Both` shore
   value, water-cut mixed convention, suitability clamped to [0,1].
5. **Deterministic only.** No network, no `Date.now()`/`Math.random()` in assertions; pass inputs in.
6. **Keep economics/data tests in `src/lib/__tests__`.** When you change the engine or the data
   normalization, update or add a test in the same PR — a green build is required to merge.
7. **Don't delete a failing test to go green.** Fix the code or fix the (justified) expectation.
