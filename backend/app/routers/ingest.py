from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session

from ..config import settings
from ..db import get_session
from ..ingest import IngestError, ingest_from_google

router = APIRouter(prefix="/api", tags=["ingest"])


def _check_secret(x_ingest_secret: Optional[str] = Header(default=None)) -> None:
    if x_ingest_secret != settings.ingest_secret:
        raise HTTPException(status_code=401, detail="Bad ingest secret")


def _run(session: Session) -> dict:
    try:
        version = ingest_from_google(session)
    except IngestError as e:
        # Validation failed → prior version still serving.
        raise HTTPException(status_code=422, detail=f"Ingest rejected, kept previous data: {e}")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Ingest failed: {e}")
    return {"ok": True, "version": version.id, "rows": version.rows, "updatedAt": version.created_at.isoformat()}


@router.post("/ingest/google")
def ingest_google(_: None = Depends(_check_secret), session: Session = Depends(get_session)) -> dict:
    """Called by the Google Apps Script onChange trigger (shared secret)."""
    return _run(session)


@router.post("/admin/reingest")
def admin_reingest(_: None = Depends(_check_secret), session: Session = Depends(get_session)) -> dict:
    """Manual force re-sync."""
    return _run(session)
