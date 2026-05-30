# Tigbourne Oil Field Intelligence — Backend (starter)

FastAPI + SQLModel + PostgreSQL API for the Tigbourne frontend. Runs out of the box on SQLite
with the frontend's bundled data seeded, so you have a working API in one command — then connect
Postgres + the Google Sheet for the live "edit sheet → site updates" loop.

## Quick start
```bash
cd backend            # if placed in the team repo alongside frontend/
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # defaults work for local dev
uvicorn app.main:app --reload --port 8000
```
- API: http://localhost:8000  · Interactive docs: http://localhost:8000/docs
- On first boot it seeds from `../oilfield-platform/src/data/{fields.json,integrity.json}`
  (set `FRONTEND_DATA_DIR` if your layout differs).

Verify:
```bash
curl localhost:8000/health
curl localhost:8000/api/data/fields | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['version'], len(d['fields']),'fields',len(d['ranges']),'ranges')"
curl localhost:8000/api/data/integrity | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['mismatches']),'mismatches',len(d['audit']),'audit')"
```

## Endpoints (match the frontend contract)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/data/fields` | `{ fields, ranges, regions, version, updatedAt }` |
| GET | `/api/data/integrity` | `{ auditHeaders, audit, mismatchHeaders, mismatches }` |
| GET | `/api/v1/fields` | external product — requires `X-API-Key` |
| POST | `/api/auth/signup` · `/login` | JWT; returns `{ access_token, user }` |
| GET | `/api/auth/me` | bearer token |
| GET/POST/DELETE | `/api/keys` | Enterprise only; POST returns the token once |
| POST | `/api/billing/checkout` · `/portal` · `/webhook` | Stripe (501 stub until configured) |
| GET | `/api/prices/forward-curve` | server-side Brent/WTI/Dubai + cache |
| POST | `/api/ingest/google` · `/api/admin/reingest` | `X-Ingest-Secret` header |

## Google Sheets ingest (the live loop)
1. Google Cloud project → enable **Sheets API** → create a **service account** → download its JSON
   to `backend/service-account.json`.
2. **Share the Google Sheet** (read-only) with the service-account email.
3. Set `GOOGLE_SHEET_ID` and `INGEST_SECRET` in `.env`; `pip install google-api-python-client google-auth`.
4. The Sheet must have the 6 region tabs (Asia, Middle East, Africa, Europe, North America, LATAM)
   with the **same column order** as the source Excel.
5. Trigger a sync: `curl -X POST localhost:8000/api/admin/reingest -H "X-Ingest-Secret: <secret>"`.
6. For instant updates, paste `apps_script.gs` into the Sheet's Apps Script and add an `onChange`
   trigger. Add a 5–15 min scheduled call to `/api/admin/reingest` (Render cron) as the fallback.

Ingest reuses `app/normalize.py` (water-cut/shore/P&A normalization + ≥5% mismatch flagging) — the
same rules documented in the frontend `CLAUDE.md`. Each ingest writes a **new versioned dataset**
and flips the "current" pointer; if a sheet fails validation the previous version keeps serving,
so the site never breaks. Test against a local file without Google:
```python
from app.db import engine; from sqlmodel import Session
from app.ingest import ingest_from_xlsx
with Session(engine) as s: ingest_from_xlsx(s, "/path/to/dataset.xlsx")   # needs openpyxl
```

## Frontend wiring
Set `VITE_API_BASE=http://localhost:8000` in the frontend; point `fields.ts` (fetch
`/api/data/fields`), `integrity.ts`, `billing.ts`, `prices.ts`, and `AuthContext` (JWT) at it.

## Deploy (recommended managed stack)
- **DB:** Neon/Supabase → set `DATABASE_URL` (Postgres).
- **API:** Render/Railway web service (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`) + a cron
  service hitting `/api/admin/reingest`.
- Set `CORS_ORIGINS`, `JWT_SECRET`, Stripe + Google + price-feed secrets as env vars.
- Portable to AWS (ECS/Fargate + RDS) later — no code change.
