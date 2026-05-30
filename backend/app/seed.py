import json
from pathlib import Path

from sqlmodel import Session

from .config import settings
from .normalize import AUDIT_HEADERS, MISMATCH_HEADERS
from .store import current_version, write_version


def seed_if_empty(session: Session) -> None:
    """Load the frontend's bundled fields.json + integrity.json once, so the API
    serves real data immediately even before the Google Sheet is connected."""
    if current_version(session):
        return

    data_dir = Path(settings.frontend_data_dir)
    fields_path = data_dir / "fields.json"
    integrity_path = data_dir / "integrity.json"
    if not fields_path.exists():
        print(f"[seed] {fields_path} not found — starting empty. Connect Google Sheets or POST /api/admin/reingest.")
        return

    records = json.loads(fields_path.read_text())
    integrity = (
        json.loads(integrity_path.read_text())
        if integrity_path.exists()
        else {"auditHeaders": AUDIT_HEADERS, "audit": [], "mismatchHeaders": MISMATCH_HEADERS, "mismatches": []}
    )
    v = write_version(session, records, integrity, source="seed")
    print(f"[seed] loaded {v.rows} fields (version {v.id}) from bundled JSON")
