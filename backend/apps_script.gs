/**
 * Google Apps Script — instant "edit the sheet → update the site".
 *
 * Setup:
 *   1. Open the Google Sheet → Extensions → Apps Script, paste this in.
 *   2. Set BACKEND_URL + INGEST_SECRET below (Project Settings → Script Properties is cleaner).
 *   3. Triggers (clock icon) → Add Trigger → onSheetChange → From spreadsheet → On change.
 *   4. The 5–15 min backend poll is the fallback if this doesn't fire.
 */
const BACKEND_URL = 'https://api.tigbourne.com'; // your deployed API
const INGEST_SECRET = 'change-me-ingest-secret'; // must match the backend INGEST_SECRET

function onSheetChange(e) {
  // Debounce: skip rapid successive edits within ~30s.
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const last = Number(props.getProperty('lastSync') || 0);
  if (now - last < 30 * 1000) return;
  props.setProperty('lastSync', String(now));

  UrlFetchApp.fetch(BACKEND_URL + '/api/ingest/google', {
    method: 'post',
    headers: { 'X-Ingest-Secret': INGEST_SECRET },
    muteHttpExceptions: true,
  });
}
