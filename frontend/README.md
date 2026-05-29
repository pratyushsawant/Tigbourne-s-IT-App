# Tigbourne · Oil Field Intelligence — Frontend

Enterprise web frontend for Tigbourne Capital's Oil Field Data Platform. Lets oil companies,
banks, and chemical suppliers screen any oil field on earth, filter by key parameters, view
field-level detail, and export institutional-grade analysis.

This is the **front-end build only** — UI runs entirely in the browser against the bundled
dataset. The real platform backs these same screens with a FastAPI + PostgreSQL API (per the
team deliverables doc); the components are structured so the data layer can be swapped for live
API calls with minimal changes.

## Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** — Apple/Claude-inspired aesthetic, white + gold palette
- **React Router** — landing / sign-in / authenticated app
- **Recharts** — analytics visualizations

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle to dist/
```

## What's built

| Route | Screen | Notes |
|-------|--------|-------|
| `/` | Landing page | Hero, live data preview, stats, features, buyer segments, enterprise/security, CTA |
| `/signin` | Sign in | **Mock auth** — any email + password signs in; "demo account" button for instant access. Swap `signIn()` for real JWT later. |
| `/app` | Field Explorer | Filterable grid over 1,979 real fields — region, on/off-shore, and range filters (water cut, API, BHT, lift cost, oil rate, depth, drill cost…). Sort any column. |
| `/app/field/:id` | Field detail | All parameters grouped (production / reservoir / location / cost) + a chemical-recovery suitability scorecard. |
| `/app/analytics` | Analytics | KPIs, fields-by-region, water-cut distribution, top operators, on/offshore split, API-vs-temperature scatter. |

### Export
Any filtered result set exports to **CSV**, **PDF** (print-to-PDF, branded), and **Word** (.doc).
See `src/lib/export.ts`.

## Data

`src/data/fields.json` — 1,979 fields across 6 regions, 90 countries, 802 operators, normalized
from the source Excel dataset (`0000. FINAL Oilfields Dataset`). The column schema and
units live in `src/lib/fields.ts` (`COLUMNS`), which drives the grid, filters, and detail view.

To regenerate from an updated Excel sheet, re-run the extraction (openpyxl) that maps the 22
source columns to the canonical keys in `fields.ts`.

## Project layout

```
src/
  context/AuthContext.tsx   session (localStorage-backed, synchronous load)
  lib/fields.ts             dataset + column metadata + ranges
  lib/export.ts             CSV / PDF / DOCX exporters
  components/               Logo, icons, RangeSlider
  pages/Landing.tsx         marketing site
  pages/SignIn.tsx          auth gate
  pages/app/                AppLayout, Explorer, FieldDetail, Analytics
```

## Notes for the team

- Auth is intentionally mocked for this build. `useAuth().signIn` is the single integration point
  for real JWT login against the API.
- The grid renders the first 250 matches for performance; **exports include the full filtered set.**
  Swap in virtualization (e.g. TanStack Virtual) when wiring live data if you want all rows rendered.
- Confidential — covered by the Tigbourne Capital NDA & non-circumvention agreement.
