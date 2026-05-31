"""Read the source spreadsheet — from Google Sheets (prod) or a local .xlsx (testing).

Two Google auth modes are supported:
  • API key   (settings.google_api_key)            — simplest; sheet must be link-viewable.
  • Service account (settings.google_service_account_file) — private; sheet shared with the
    service-account email. Preferred for the NDA-covered dataset.

The API-key path uses httpx only (no extra deps). The service-account path imports the Google
client libraries lazily, so the app runs without them when that mode isn't used.
"""
from typing import Optional
from urllib.parse import quote

import httpx

from .config import settings

REGIONS = ["Asia", "Middle East", "Africa", "Europe", "North America", "LATAM"]
_SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

_OFFICE_FILE_HINT = (
    "This Google Drive file is still an uploaded Office (.xlsx) file, which the Sheets API "
    "cannot read. Open it in Google Sheets and use File → Save as Google Sheets, then use the "
    "NEW file's ID."
)


def read_google_sheet(sheet_id: Optional[str] = None) -> dict[str, list[list]]:
    sheet_id = sheet_id or settings.google_sheet_id
    if not sheet_id:
        raise RuntimeError("GOOGLE_SHEET_ID is not configured")
    if settings.google_api_key:
        return _read_via_api_key(sheet_id, settings.google_api_key)
    return _read_via_service_account(sheet_id)


def _check_office_error(text: str) -> None:
    if "must not be an Office file" in text:
        raise RuntimeError(_OFFICE_FILE_HINT)


def _read_via_api_key(sheet_id: str, api_key: str) -> dict[str, list[list]]:
    by_region: dict[str, list[list]] = {}
    with httpx.Client(timeout=30) as client:
        meta = client.get(f"{_SHEETS_API}/{sheet_id}", params={"key": api_key, "fields": "sheets.properties.title"})
        if meta.status_code != 200:
            _check_office_error(meta.text)
            raise RuntimeError(f"Sheets API metadata error {meta.status_code}: {meta.text[:300]}")
        titles = [s["properties"]["title"] for s in meta.json().get("sheets", [])]
        for title in titles:
            if title not in REGIONS:
                continue
            res = client.get(
                f"{_SHEETS_API}/{sheet_id}/values/{quote(title)}",
                params={"key": api_key, "valueRenderOption": "UNFORMATTED_VALUE"},
            )
            if res.status_code != 200:
                _check_office_error(res.text)
                raise RuntimeError(f"Sheets API values error for '{title}' {res.status_code}: {res.text[:200]}")
            by_region[title] = res.json().get("values", [])[1:]  # drop header row
    if not by_region:
        raise RuntimeError(f"No region tabs found. Expected any of: {', '.join(REGIONS)}")
    return by_region


def _read_via_service_account(sheet_id: str) -> dict[str, list[list]]:
    from google.oauth2 import service_account  # lazy
    from googleapiclient.discovery import build

    creds = service_account.Credentials.from_service_account_file(
        settings.google_service_account_file, scopes=_SCOPES
    )
    svc = build("sheets", "v4", credentials=creds, cache_discovery=False)
    meta = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
    titles = [s["properties"]["title"] for s in meta.get("sheets", [])]

    by_region: dict[str, list[list]] = {}
    for title in titles:
        if title not in REGIONS:
            continue
        res = (
            svc.spreadsheets()
            .values()
            .get(spreadsheetId=sheet_id, range=title, valueRenderOption="UNFORMATTED_VALUE")
            .execute()
        )
        by_region[title] = res.get("values", [])[1:]
    return by_region


def read_xlsx(path: str) -> dict[str, list[list]]:
    import openpyxl  # lazy

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    by_region: dict[str, list[list]] = {}
    for ws in wb.worksheets:
        if ws.title not in REGIONS:
            continue
        by_region[ws.title] = [list(r) for r in ws.iter_rows(min_row=2, values_only=True)]
    return by_region
