import time

import httpx
from fastapi import APIRouter

from ..config import settings

router = APIRouter(prefix="/api/prices", tags=["prices"])

REFERENCE = [
    {"symbol": "BRENT", "name": "Brent", "price": 75.0, "change": 0.0},
    {"symbol": "WTI", "name": "WTI", "price": 71.2, "change": 0.0},
    {"symbol": "DUBAI", "name": "Dubai (derived)", "price": 73.4, "change": 0.0},
]
_CACHE: dict = {"at": 0.0, "data": None}
_TTL = 600  # 10 minutes
# Keyless live feed: Brent = cb.f, WTI = cl.f. (Dubai isn't published free — derived from Brent.)
_STOOQ = "https://stooq.com/q/l/?s=cb.f+cl.f&f=sd2t2ohlc&e=csv"


async def _fetch_stooq() -> list[dict]:
    async with httpx.AsyncClient(timeout=8) as client:
        resp = await client.get(_STOOQ)
        resp.raise_for_status()
        rows: dict = {}
        for line in resp.text.strip().splitlines():
            p = line.split(",")
            if len(p) < 7:
                continue
            try:
                open_, close = float(p[3]), float(p[6])
            except ValueError:
                continue
            rows[p[0].upper()] = (close, close - open_)
        brent, wti = rows.get("CB.F"), rows.get("CL.F")
        if not brent or not wti:
            raise RuntimeError("stooq: missing Brent/WTI quotes")
        bp, bc = brent
        wp, wc = wti
        dubai = bp - settings.dubai_differential  # Dubai ≈ Brent − EFS differential
        return [
            {"symbol": "BRENT", "name": "Brent", "price": round(bp, 2), "change": round(bc, 2)},
            {"symbol": "WTI", "name": "WTI", "price": round(wp, 2), "change": round(wc, 2)},
            {"symbol": "DUBAI", "name": "Dubai (derived)", "price": round(dubai, 2), "change": round(bc, 2)},
        ]


@router.get("/forward-curve")
async def forward_curve() -> dict:
    now = time.time()
    if _CACHE["data"] and now - _CACHE["at"] < _TTL:
        return _CACHE["data"]

    quotes, live = REFERENCE, False
    try:
        if settings.price_api_url:
            # Optional real provider (e.g. a true Dubai feed). Adapt to its payload shape.
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(settings.price_api_url)
                resp.raise_for_status()
                quotes = resp.json().get("quotes", REFERENCE)
                live = True
        else:
            quotes = await _fetch_stooq()
            live = True
    except Exception:  # noqa: BLE001 — any failure falls back to reference prices
        quotes, live = REFERENCE, False

    data = {"quotes": quotes, "live": live, "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))}
    _CACHE.update(at=now, data=data)
    return data
