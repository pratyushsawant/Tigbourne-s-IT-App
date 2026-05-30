"""Read the source spreadsheet — from Google Sheets (prod) or a local .xlsx (testing).

Google libs are imported lazily so the app runs without them when the Sheet isn't connected.
"""
from typing import Optional

from .config import settings

REGIONS = ["Asia", "Middle East", "Africa", "Europe", "North America", "LATAM"]
_SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


def read_google_sheet(sheet_id: Optional[str] = None) -> dict[str, list[list]]:
    sheet_id = sheet_id or settings.google_sheet_id
    if not sheet_id:
        raise RuntimeError("GOOGLE_SHEET_ID is not configured")

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
        values = res.get("values", [])
        by_region[title] = values[1:]  # drop header row
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
