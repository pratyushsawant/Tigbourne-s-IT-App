"""
Test the ingest pipeline from a local .xlsx — no Google setup required.

    python -m scripts.ingest_xlsx "/path/to/Oilfields.xlsx"

Reads the 6 region tabs, runs the same normalization + mismatch/audit logic the live
Google ingest uses, writes a new dataset version, and prints a summary. Use this to confirm
your spreadsheet parses correctly before wiring up Google.
"""
import sys

from sqlmodel import Session

from app.db import engine, init_db
from app.ingest import IngestError, ingest_from_xlsx
from app.store import current_integrity


def main() -> None:
    if len(sys.argv) < 2:
        print('usage: python -m scripts.ingest_xlsx "<path-to.xlsx>"')
        sys.exit(1)
    path = sys.argv[1]
    init_db()
    with Session(engine) as session:
        try:
            version = ingest_from_xlsx(session, path)
        except IngestError as e:
            print(f"❌ Ingest rejected (previous data kept): {e}")
            sys.exit(2)
        integ = current_integrity(session)
        print(f"✅ Ingested version {version.id}: {version.rows} fields")
        print(f"   Flagged mismatches: {len(integ.get('mismatches', []))}")
        print(f"   Regions: confirm all 6 tabs were found in the workbook")


if __name__ == "__main__":
    main()
