from typing import Optional

import json

from sqlmodel import Session, select

from .models import DatasetVersion, OilFieldRow
from .normalize import KEYS

# Columns we copy from a normalized record into OilFieldRow.
MODEL_KEYS = ["id", "region"] + KEYS


def current_version(session: Session) -> Optional[DatasetVersion]:
    return session.exec(
        select(DatasetVersion).where(DatasetVersion.is_current == True)  # noqa: E712
    ).first()


def current_fields(session: Session) -> list[OilFieldRow]:
    v = current_version(session)
    if not v:
        return []
    return list(session.exec(select(OilFieldRow).where(OilFieldRow.version == v.id)).all())


def current_integrity(session: Session) -> dict:
    v = current_version(session)
    if not v:
        return {"auditHeaders": [], "audit": [], "mismatchHeaders": [], "mismatches": []}
    return json.loads(v.integrity_json or "{}")


def write_version(session: Session, records: list[dict], integrity: dict, source: str) -> DatasetVersion:
    """Insert a new dataset version, its rows + integrity, and make it current."""
    version = DatasetVersion(source=source, rows=len(records), integrity_json=json.dumps(integrity))
    session.add(version)
    session.commit()
    session.refresh(version)

    for rec in records:
        session.add(OilFieldRow(version=version.id, **{k: rec.get(k) for k in MODEL_KEYS}))

    # flip the "current" pointer atomically-ish
    for old in session.exec(select(DatasetVersion).where(DatasetVersion.is_current == True)).all():  # noqa: E712
        old.is_current = False
        session.add(old)
    version.is_current = True
    session.add(version)
    session.commit()
    session.refresh(version)
    return version
