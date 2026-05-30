from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..db import get_session
from ..models import OilFieldRow, User
from ..security import get_api_key_user
from ..store import current_fields, current_integrity, current_version

router = APIRouter(prefix="/api/data", tags=["data"])
external = APIRouter(prefix="/api/v1", tags=["external"])

FILTERABLE = [
    "oilBblPerDay", "waterCut", "api", "bht", "liftCost",
    "numWells", "declinePct", "depthFt", "drillCost", "pa",
]


def _field_dict(row: OilFieldRow) -> dict:
    d = row.model_dump()
    d.pop("row_pk", None)
    d.pop("version", None)
    return d


def _payload(session: Session) -> dict:
    version = current_version(session)
    fields = [_field_dict(r) for r in current_fields(session)]
    ranges: dict[str, list[float]] = {}
    for k in FILTERABLE:
        vals = [f[k] for f in fields if isinstance(f.get(k), (int, float))]
        if vals:
            ranges[k] = [min(vals), max(vals)]
    return {
        "fields": fields,
        "ranges": ranges,
        "regions": sorted({f["region"] for f in fields}),
        "version": version.id if version else 0,
        "updatedAt": version.created_at.isoformat() if version else None,
    }


@router.get("/fields")
def get_fields(session: Session = Depends(get_session)) -> dict:
    return _payload(session)


@router.get("/integrity")
def get_integrity(session: Session = Depends(get_session)) -> dict:
    return current_integrity(session)


@external.get("/fields")
def external_fields(
    user: User = Depends(get_api_key_user),
    session: Session = Depends(get_session),
) -> dict:
    """Programmatic access for Enterprise subscribers (X-API-Key)."""
    return _payload(session)
