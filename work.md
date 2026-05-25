# Work Log — Frontend Build

## What Was Built

### Project Setup
- Scaffolded with **React + Vite + TypeScript** (fast builds, type safety)
- **Tailwind CSS v4** via the Vite plugin for styling
- **React Router** for client-side navigation
- **Lucide React** for icons (lightweight, consistent)
- Fonts: Inter (UI text) + JetBrains Mono (data/numbers)

### Pages

**Login** (`src/pages/Login.tsx`)
- Split layout: branding panel left, form right
- Placeholder auth — stores user to localStorage, ready to swap for JWT when Nalin's API is up
- Email + password fields, error states
- Redirects to dashboard on login

**Dashboard** (`src/pages/Dashboard.tsx`)
- Stat cards: total fields, active, declining, countries covered
- Secondary stats: avg water cut, total production, intervention candidates (WC >= 60%)
- Two mini-tables: top producers by oil rate, highest water cut fields
- Clicking any row navigates to the field detail view

**Field Explorer** (`src/pages/Explorer.tsx`)
- Full data table with all key columns (ID, name, operator, country, type, status, oil rate, water cut, API gravity, temperature, lifting cost)
- **Filters**: search box, country dropdown, type (onshore/offshore), status, water cut range
- **Sorting**: click any column header to sort asc/desc
- **Pagination**: 10 rows per page with prev/next and page buttons
- **Export button**: CSV, PDF, DOCX (see below)
- Color-coded status badges and water cut highlighting (green < 60, amber 60-79, red 80+)

**Field Detail** (`src/pages/FieldDetail.tsx`)
- Full detail view for a single oil field
- Sections: Production, Reservoir Conditions, Location, Cost Data
- Water cut position bar — visual indicator showing where the field sits on the 0-100% scale with color zones (green/amber/red) and intervention timing guidance
- API gravity highlighted when in sweet spot (16-40)
- Temperature flagged when above 130 C (chemicals stop working)
- P&A estimate shown as "Not available" with amber highlight when missing
- Placeholder section for CEOR analysis (post-MVP)

### Components

**Sidebar** (`src/components/Sidebar.tsx`)
- Fixed left navigation: Dashboard, Field Explorer
- Tigbourne Capital branding with logo
- Sign out button (clears localStorage, redirects to login)

**Layout** (`src/components/Layout.tsx`)
- Sidebar + main content area wrapper with React Router Outlet

**FilterPanel** (`src/components/FilterPanel.tsx`)
- Search, country, type, status, water cut range inputs
- Reset button to clear all filters

**ExportMenu** (`src/components/ExportMenu.tsx`)
- Dropdown with three options:
  - **CSV**: generates comma-separated file with all field data columns, downloads directly
  - **PDF**: opens a print-ready HTML page in a new tab (browser print dialog for PDF save)
  - **DOCX**: generates an HTML-based .doc file that Word can open natively
- Exports whatever is currently filtered, not the full dataset

### Data

**Mock Data** (`src/data/mockFields.ts`)
- 16 realistic oil fields across 12 countries
- Fields include: Ghawar, Permian Basin, Johan Sverdrup, Lula, Prudhoe Bay, Azeri-Chirag-Gunashli, Mukhaizna, etc.
- Covers onshore/offshore, active/declining, low to high water cut
- All data is placeholder — will be replaced by Min's data and then Nalin's API

**Types** (`src/data/types.ts`)
- TypeScript interfaces for OilField, FilterState, SortState, User

### Design Decisions
- **Dark theme**: enterprise data platform aesthetic, not a startup landing page. Designed to look credible in front of UBS and Capital One.
- **No rounded corners on data elements**: sharp edges for a terminal/Bloomberg feel
- **Monospace numbers**: tabular-nums and JetBrains Mono for all numerical data so columns align properly
- **Color palette**: dark navy backgrounds, emerald green accent (energy industry), amber warnings, red alerts
- **Dense information display**: small text sizes, tight spacing — this is a data tool, not a marketing site
- **No decorative elements**: no gradients, no illustrations, no animated backgrounds

## How to Run

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173. Enter any email/password to log in (placeholder auth).

## Where We Left Off

Everything below is **done and working** — the frontend scaffold is complete with placeholder data. The app compiles, builds, and runs.

**Current state:**
- All 4 pages built: Login, Dashboard, Explorer, Field Detail
- All 4 components built: Sidebar, Layout, FilterPanel, ExportMenu
- Export works for CSV, PDF, DOCX (client-side generation)
- 16 mock oil fields loaded as placeholder data
- Auth is placeholder (localStorage) — any email/password works
- No API connected yet — everything reads from `src/data/mockFields.ts`

**Blocked on (waiting for other team members):**
- Min: placeholder data file (due June 2) — once received, swap into `mockFields.ts`
- Nalin: API spec (due ~June 21) — needed to replace mock data with real API calls

## What's Next (from deliverables doc)

**Immediate (once Min sends data):**
1. Replace `src/data/mockFields.ts` with Min's placeholder dataset
2. Verify all pages render correctly with the new data shape

**Week 3 (after Nalin publishes API spec June 15-21):**
3. Create an API service layer (`src/api/`) with fetch calls to FastAPI endpoints
4. Replace mock data imports with API calls in Dashboard, Explorer, FieldDetail
5. Add loading states and error handling for API requests

**Week 4 — MVP completion:**
6. Wire up JWT authentication to the real login endpoint — replace localStorage auth
7. Add user permission levels (admin, institutional, individual) to the UI
8. Test end-to-end: filter -> view -> export with real data
9. Data visualisation graphs (optional for MVP, add if time allows)

**Post-MVP (Month 2-3):**
10. CEOR analysis page with break-even and NPV calculations
11. Water cut intervention curve visualisation
12. Commodity price feed display (Brent, WTI)
13. API key management page for external subscribers
