"""Background auto-reingest: poll the Google Sheet every N minutes (in-process, no external
cron needed). Enabled when GOOGLE_SHEET_ID is set and INGEST_POLL_MINUTES > 0."""
from __future__ import annotations

import asyncio

from sqlmodel import Session

from .config import settings
from .db import engine
from .ingest import IngestError, ingest_from_google


async def run_ingest_once() -> None:
    """Run one sync in a worker thread (the ingest is synchronous DB + HTTP work)."""

    def job() -> None:
        with Session(engine) as session:
            try:
                v = ingest_from_google(session)
                print(f"[ingest] synced version {v.id}: {v.rows} rows")
            except IngestError as e:
                print(f"[ingest] rejected, kept previous version: {e}")
            except Exception as e:  # noqa: BLE001
                print(f"[ingest] failed (kept previous version): {e}")

    await asyncio.to_thread(job)


async def _poll_loop() -> None:
    await asyncio.sleep(2)  # let startup finish, then do an initial sync
    interval = max(1, settings.ingest_poll_minutes) * 60
    while True:
        await run_ingest_once()
        await asyncio.sleep(interval)


def start_scheduler() -> asyncio.Task | None:
    if not settings.google_sheet_id or settings.ingest_poll_minutes <= 0:
        return None
    print(f"[ingest] auto-sync enabled — every {settings.ingest_poll_minutes} min")
    return asyncio.create_task(_poll_loop())
