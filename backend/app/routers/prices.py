import time

import httpx
from fastapi import APIRouter

from ..config import settings

router = APIRouter(prefix="/api/prices", tags=["prices"])

REFERENCE = [
    {"symbol": "BRENT", "name": "Brent", "price": 75.0},
    {"symbol": "WTI", "name": "WTI", "price": 71.2},
    {"symbol": "DUBAI", "name": "Dubai", "price": 73.4},
]
_CACHE: dict = {"at": 0.0, "data": None}
_TTL = 600  # 10 minutes


@router.get("/forward-curve")
async def forward_curve() -> dict:
    now = time.time()
    if _CACHE["data"] and now - _CACHE["at"] < _TTL:
        return _CACHE["data"]

    quotes, live = REFERENCE, False
    if settings.price_api_url:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(settings.price_api_url)
                resp.raise_for_status()
                # Adapt this mapping to your chosen provider's payload shape.
                payload = resp.json()
                quotes = payload.get("quotes", REFERENCE)
                live = True
        except Exception:  # noqa: BLE001
            quotes, live = REFERENCE, False

    data = {"quotes": quotes, "live": live, "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))}
    _CACHE.update(at=now, data=data)
    return data
