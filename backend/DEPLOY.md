# Deploy the platform (backend + frontend)

Goal: a live URL where editing the Google Sheet updates the site. ~30–45 min.
Recommended stack: **Render** (API + Postgres) + **Cloudflare Pages / Netlify** (frontend).

---

## 1. Backend → Render

### Option A — Blueprint (one click)
1. Push this repo to GitHub (already done).
2. Render → **New → Blueprint** → pick the repo. It reads `render.yaml` (API + Postgres).
3. When prompted, fill the secrets:
   - `GOOGLE_SHEET_ID` = `1yB-vg21EEJY8aKQ6E9NJkxelKey51uR1vWm7usMU47Y`
   - `GOOGLE_API_KEY` = your key
   - `CORS_ORIGINS` = your frontend URL (set after step 2; can start as `*` temporarily)
   - `FRONTEND_BASE_URL` = your frontend URL
   `DATABASE_URL`, `JWT_SECRET`, `INGEST_SECRET`, `INGEST_POLL_MINUTES=10` are wired automatically.
4. Deploy. Visit `https://<your-api>.onrender.com/health` → `{"status":"ok"}`, then `/api/data/fields`.

### Option B — Manual web service
1. Render → **New → Web Service** → pick the repo.
2. **Root Directory:** `backend` · **Build:** `pip install -r requirements.txt` ·
   **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` · **Health check:** `/health`
3. Add a Render **Postgres** (or Supabase/Neon) and set `DATABASE_URL` to its connection string.
4. Add env vars: `GOOGLE_SHEET_ID`, `GOOGLE_API_KEY`, `INGEST_SECRET` (random), `JWT_SECRET`
   (random), `INGEST_POLL_MINUTES=10`, `CORS_ORIGINS` (frontend URL), `FRONTEND_BASE_URL`.

On boot the API seeds, then auto-syncs the sheet (and every 10 min after). No cron needed.

---

## 2. Frontend → Cloudflare Pages (or Netlify/Vercel)
1. New project → pick the repo. **Root directory:** `frontend`.
2. **Build command:** `npm run build` · **Output dir:** `dist`.
3. Env var: **`VITE_API_BASE`** = your Render API URL (e.g. `https://tigbourne-api.onrender.com`).
4. Deploy → you get a URL like `https://tigbourne.pages.dev`.

---

## 3. Close the loop
1. Set the backend's `CORS_ORIGINS` to the deployed frontend URL (redeploy backend).
2. Open the site → it loads live data from the sheet. Edit a cell → within 10 min it updates
   (or instantly if you add the Apps Script trigger — `apps_script.gs`, with `BACKEND_URL` = the
   Render API URL).
3. Point your domain (`app.tigbourne.com` → frontend, `api.tigbourne.com` → Render) via DNS.

---

## 4. Before real customers
- **NDA**: switch from the API key to a **service account** and re-restrict the sheet
  (`SETUP_GOOGLE_SHEETS.md` Steps 2–4), and rotate the shared API key.
- Stripe: add `STRIPE_SECRET_KEY`, price IDs, and the webhook (`/api/billing/webhook`).
- Add error tracking (Sentry) and a custom domain with TLS (handled by Render/Cloudflare).

### Notes
- Render free tier sleeps after inactivity (first request is slow); upgrade for always-on.
- Free Postgres has row/size limits — fine for ~2k fields; upgrade or use Supabase/Neon for scale.
