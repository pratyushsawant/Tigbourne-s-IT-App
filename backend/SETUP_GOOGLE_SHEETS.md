# Connect a Google Sheet → the live website

> ⚠️ **SECURITY TODO (before launch) — NDA hardening.** We're currently using an **API key**,
> which requires the sheet to be shared **"Anyone with the link → Viewer"**. For an NDA /
> non-circumvention–covered dataset that's an exposure (anyone with the URL can read it). Before
> going to real customers: (1) switch to a **service account** (private sharing — Steps 2–4 below),
> (2) set the sheet back to **Restricted**, and (3) **rotate the API key** that was shared in chat
> and restrict it to the Sheets API. The backend already supports both auth modes — just set
> `GOOGLE_SERVICE_ACCOUNT_FILE` instead of `GOOGLE_API_KEY` in `.env`.


This wires your spreadsheet to the backend so editing the sheet updates the site.
Time: ~20–30 min. You do steps in Google + fill in `.env`; the code is already written.

---

## Step 0 (optional but recommended) — prove the pipeline locally first, no Google needed
Verify the ingest works against your existing Excel before doing any Google setup.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt openpyxl
python -m scripts.ingest_xlsx "/path/to/your/Oilfields.xlsx"
```
You should see `ingested version N rows 1978`. That confirms parsing/normalization works.

---

## Step 1 — Put your data in a Google Sheet
The Sheets API reads **native Google Sheets** (not raw `.xlsx`), so convert once:
1. Go to **drive.google.com** → **New → File upload** → upload your `.xlsx`.
2. Right-click the uploaded file → **Open with → Google Sheets** → **File → Save as Google Sheets**.
   (This creates a native Sheet you'll edit from now on.)
3. Make sure the tabs are named **exactly**: `Asia`, `Middle East`, `Africa`, `Europe`,
   `North America`, `LATAM`, and the **first row is the header** (same column order as the Excel).
4. From the URL, copy the **Sheet ID** — the long string between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`

---

## Step 2 — Create a Google Cloud project + enable the Sheets API
1. Go to **console.cloud.google.com** → top bar → **Select a project → New Project** → name it
   `Tigbourne` → **Create**.
2. **APIs & Services → Library** → search **"Google Sheets API"** → **Enable**.

---

## Step 3 — Create a service account + download its key
1. **APIs & Services → Credentials → Create credentials → Service account**.
2. Name it `tigbourne-ingest` → **Create and continue** → skip roles (we share the Sheet
   directly) → **Done**.
3. Click the new service account → **Keys → Add key → Create new key → JSON → Create**.
   A `.json` file downloads.
4. Move it to the backend folder and name it `service-account.json`:
   `backend/service-account.json` (it's git-ignored — never commit it).
5. Open that JSON and copy the **`client_email`** value
   (looks like `tigbourne-ingest@tigbourne-xxxx.iam.gserviceaccount.com`).

---

## Step 4 — Share the Sheet with the service account
1. Open your Google Sheet → **Share**.
2. Paste the service-account **`client_email`** → role **Viewer** → **Send**.
   (This is what lets the backend read the sheet.)

---

## Step 5 — Configure the backend
Create `backend/.env` (copy from `.env.example`) and set:
```env
GOOGLE_SHEET_ID=THE_ID_FROM_STEP_1
GOOGLE_SERVICE_ACCOUNT_FILE=service-account.json
INGEST_SECRET=pick-a-long-random-string
# DATABASE_URL=postgresql://...   # set in prod; defaults to local SQLite otherwise
```
Install the Google client libraries (only needed for the live ingest):
```bash
pip install google-api-python-client google-auth
```

---

## Step 6 — Run it and pull the sheet
```bash
uvicorn app.main:app --reload --port 8000
```
In another terminal, trigger a sync (use your INGEST_SECRET):
```bash
curl -X POST -H "X-Ingest-Secret: pick-a-long-random-string" \
  http://localhost:8000/api/admin/reingest
# → {"ok":true,"version":2,"rows":1978,"updatedAt":"..."}

curl http://localhost:8000/api/data/fields | head -c 300   # confirm live data
```

---

## Step 7 — Point the website at the backend
In `frontend/.env` (the React app):
```env
VITE_API_BASE=http://localhost:8000
```
Restart `npm run dev`. The site now reads from your Google Sheet. **Edit a cell, run the
`reingest` curl, refresh the site → the change appears.** Bad rows show in the Data
Integrity panel (never dropped); a broken sheet keeps the previous version serving.

---

## Step 8 (optional) — make it update automatically
You don't want to run curl by hand. Two options:

**A. Instant — Apps Script trigger (once the backend is deployed to a public URL):**
1. In the Sheet → **Extensions → Apps Script**.
2. Paste the contents of `backend/apps_script.gs`; set `BACKEND_URL` (your deployed API root,
   e.g. `https://api.tigbourne.com`) and `INGEST_SECRET` (match the backend `.env`).
3. **Triggers** (clock icon, left rail) → **Add Trigger** → function `onSheetChange`,
   event source **From spreadsheet**, event type **On change** → **Save** and authorize.
   Edits now auto-sync (debounced ~30s). The 10-min backend poll is the fallback.
   *(Apps Script can only reach a public URL — works after you deploy the API, not on localhost.)*

**B. Simple — scheduled poll:** a cron that hits `/api/admin/reingest` every ~10 min
(Render Cron Job, GitHub Action, or `crontab`). Lower-tech, ~10-min latency.

---

### Troubleshooting
- **403 / "The caller does not have permission"** → you didn't share the Sheet with the
  service-account email (Step 4), or the wrong Sheet ID.
- **"GOOGLE_SHEET_ID is not configured"** → `.env` not loaded; run uvicorn from `backend/`.
- **`ModuleNotFoundError: googleapiclient`** → run the `pip install` in Step 5.
- **422 "Ingest rejected, kept previous data"** → the sheet failed validation (e.g. <50 rows
  or out-of-range water cut); the site keeps serving the last good version. Fix the sheet, re-run.
