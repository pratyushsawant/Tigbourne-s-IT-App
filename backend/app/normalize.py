"""
Spreadsheet → normalized field records, and data-integrity (mismatches + audit).

This is the single source of truth for the ingest rules documented in the frontend's
CLAUDE.md. The 6 region tabs share this column order (0-indexed):

 0 Country        6 W-bbl/d        12 TDS (ppm)        18 Sulfur %
 1 Operator       7 Liquid bbl/d   13 API gravity      19 Porosity %
 2 Oilfield       8 Water cut      14 On/Off shore     20 Permeability (md)
 3 O-bbl/d        9 Decline %/yr   15 Depth ft         21 Res pH
 4 No W           10 Lift ($/bbl)  16 Drill ($/well)   22 P&A ($)
 5 bbl/Well       11 BHT (°C)      17 New wells/yr
"""
from __future__ import annotations

from typing import Optional

from datetime import datetime

KEYS = [
    "country", "operator", "oilfield", "oilBblPerDay", "numWells", "bblPerWell",
    "waterBblPerDay", "liquidBblPerDay", "waterCut", "declinePct", "liftCost", "bht",
    "tds", "api", "shore", "depthFt", "drillCost", "wellsPerYear", "sulfur",
    "porosity", "permeability", "resPh", "pa",
]
STR_KEYS = {"country", "operator", "oilfield", "shore"}

AUDIT_HEADERS = ["#", "Sheet", "Range", "Change Type", "What Changed", "Why", "Date"]
MISMATCH_HEADERS = [
    "Sheet", "Row", "Country", "Field", "Reported O-bbl/d", "No W", "bbld/Well",
    "Expected (E*F)", "Diff", "|Diff| %",
]


def to_num(v) -> Optional[float]:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def normalize_shore(v) -> str:
    s = (str(v).strip().lower() if v is not None else "")
    if s.startswith("off"):
        return "Offshore"
    if s.startswith("on"):
        return "Onshore"
    return str(v).strip() if v else "Unknown"


def normalize_row(region: str, row: list, field_id: int) -> Optional[dict]:
    """Return a normalized field dict, or None if the row has no oilfield name."""
    name = row[2] if row and len(row) > 2 else None
    if name is None or not str(name).strip():
        return None
    rec: dict = {"id": field_id, "region": region}
    for i, key in enumerate(KEYS):
        v = row[i] if i < len(row) else None
        if key in STR_KEYS:
            rec[key] = str(v).strip() if v is not None else ""
        else:
            rec[key] = to_num(v)
    rec["shore"] = normalize_shore(rec.get("shore"))
    # Water cut: fractions (<=1) → percent; handles the Asia mixed convention.
    wc = rec.get("waterCut")
    if isinstance(wc, (int, float)) and wc <= 1.0:
        rec["waterCut"] = round(wc * 100, 1)
    return rec


def normalize_sheets(by_region: dict[str, list[list]]) -> list[dict]:
    """by_region: {tabName: rows-without-header}. Returns normalized field dicts."""
    out: list[dict] = []
    fid = 1
    for region, rows in by_region.items():
        for row in rows:
            rec = normalize_row(region, row, fid)
            if rec is None:
                continue
            rec["_row"] = len(out) + 2  # spreadsheet row (approx, for audit)
            out.append(rec)
            fid += 1
    return out


def compute_mismatches(records: list[dict]) -> list[list]:
    """Flag fields where reported oil diverges ≥5% from wells × bbl/well (E×F)."""
    rows: list[list] = []
    for r in records:
        wells, per_well, reported = r.get("numWells"), r.get("bblPerWell"), r.get("oilBblPerDay")
        if not (wells and per_well and reported is not None):
            continue
        expected = wells * per_well
        if expected <= 0:
            continue
        diff = abs(reported - expected)
        ratio = diff / expected
        if ratio >= 0.05:
            rows.append([
                r["region"], r.get("_row", 0), r["country"], r["oilfield"],
                round(reported), round(wells), round(per_well),
                round(expected), round(diff), round(ratio, 4),
            ])
    rows.sort(key=lambda x: x[-1], reverse=True)
    return rows


def build_integrity(records: list[dict], prior_audit: Optional[list], source: str) -> dict:
    """Compute mismatches and prepend an audit entry for this ingest run."""
    mismatches = compute_mismatches(records)
    audit = list(prior_audit or [])
    today = datetime.utcnow().strftime("%Y-%m-%d")
    entry = [
        0, "All", "—", "Ingest",
        f"Loaded {len(records)} fields from {source}; flagged {len(mismatches)} production mismatches (≥5%)",
        "Scheduled data sync — bad rows flagged, never dropped",
        today,
    ]
    audit = [entry] + audit
    for i, a in enumerate(audit, start=1):  # renumber
        a[0] = i
    return {
        "auditHeaders": AUDIT_HEADERS,
        "audit": audit,
        "mismatchHeaders": MISMATCH_HEADERS,
        "mismatches": mismatches,
    }
