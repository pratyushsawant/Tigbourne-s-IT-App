from sqlmodel import Session

from .normalize import build_integrity, normalize_sheets
from .sheets import read_google_sheet, read_xlsx
from .store import current_integrity, write_version


class IngestError(Exception):
    pass


def _validate(records: list[dict]) -> None:
    """Cheap sanity checks. On failure we raise and the caller keeps the prior
    version serving — the site never breaks on a malformed sheet."""
    if len(records) < 50:
        raise IngestError(f"Only {len(records)} valid rows parsed — refusing to replace dataset")
    bad_wc = [r for r in records if isinstance(r.get("waterCut"), (int, float)) and not (0 <= r["waterCut"] <= 100)]
    if bad_wc:
        raise IngestError(f"{len(bad_wc)} rows have out-of-range water cut after normalization")


def _ingest(session: Session, by_region: dict[str, list[list]], source_label: str, source_tag: str):
    records = normalize_sheets(by_region)
    _validate(records)
    prior_audit = current_integrity(session).get("audit", [])
    integrity = build_integrity(records, prior_audit, source=source_label)
    version = write_version(session, records, integrity, source=source_tag)
    return version


def ingest_from_google(session: Session):
    return _ingest(session, read_google_sheet(), "Google Sheet", "google")


def ingest_from_xlsx(session: Session, path: str):
    return _ingest(session, read_xlsx(path), f"Excel ({path})", "xlsx")
