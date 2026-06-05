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
_UA = {"User-Agent": "Mozilla/5.0 (compatible; TigbourneBot/1.0)"}
# Dubai isn't published free — derived from Brent. Multiple sources for resilience: free finance
# feeds (Yahoo/stooq) often block datacenter IPs, so we try server-friendly sources first
# (EIA if a key is set, then FRED — both run by institutions that allow server requests).
_YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=5d"
_STOOQ = "https://stooq.com/q/l/?s=cb.f+cl.f&f=sd2t2ohlc&e=csv"
_FRED = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}"
_EIA = (
    "https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key={key}&frequency=daily&data[]=value"
    "&facets[series][]={series}&sort[0][column]=period&sort[0][direction]=desc&length=2"
)


async def _eia(client: httpx.AsyncClient) -> dict:
    if not settings.eia_api_key:
        raise RuntimeError("no EIA key")
    out: dict = {}
    for series, key in (("RBRTE", "BRENT"), ("RWTC", "WTI")):
        r = await client.get(_EIA.format(key=settings.eia_api_key, series=series))
        r.raise_for_status()
        rows = r.json()["response"]["data"]
        price = float(rows[0]["value"])
        prev = float(rows[1]["value"]) if len(rows) > 1 else price
        out[key] = (price, price - prev)
    return out


async def _fred(client: httpx.AsyncClient) -> dict:
    out: dict = {}
    for series, key in (("DCOILBRENTEU", "BRENT"), ("DCOILWTICO", "WTI")):
        r = await client.get(_FRED.format(series=series), headers=_UA)
        r.raise_for_status()
        vals = []
        for line in r.text.strip().splitlines()[1:]:  # skip header
            parts = line.split(",")
            if len(parts) < 2:
                continue
            try:
                vals.append(float(parts[1]))
            except ValueError:
                continue  # missing days are "."
        if vals:
            out[key] = (vals[-1], vals[-1] - (vals[-2] if len(vals) > 1 else vals[-1]))
    return out


async def _yahoo(client: httpx.AsyncClient) -> dict:
    out: dict = {}
    for sym, key in (("BZ=F", "BRENT"), ("CL=F", "WTI")):
        r = await client.get(_YAHOO.format(sym=sym), headers=_UA)
        r.raise_for_status()
        meta = r.json()["chart"]["result"][0]["meta"]
        price = float(meta["regularMarketPrice"])
        prev = float(meta.get("previousClose") or meta.get("chartPreviousClose") or price)
        out[key] = (price, price - prev)
    return out


async def _stooq(client: httpx.AsyncClient) -> dict:
    r = await client.get(_STOOQ, headers=_UA)
    r.raise_for_status()
    out: dict = {}
    for line in r.text.strip().splitlines():
        p = line.split(",")
        if len(p) < 7:
            continue
        try:
            open_, close = float(p[3]), float(p[6])
        except ValueError:
            continue
        if p[0].upper() == "CB.F":
            out["BRENT"] = (close, close - open_)
        elif p[0].upper() == "CL.F":
            out["WTI"] = (close, close - open_)
    return out


async def _fetch_quotes() -> tuple[list[dict], bool]:
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for source in (_eia, _fred, _yahoo, _stooq):
            try:
                q = await source(client)
                if q.get("BRENT") and q.get("WTI"):
                    bp, bc = q["BRENT"]
                    wp, wc = q["WTI"]
                    dubai = bp - settings.dubai_differential
                    return (
                        [
                            {"symbol": "BRENT", "name": "Brent", "price": round(bp, 2), "change": round(bc, 2)},
                            {"symbol": "WTI", "name": "WTI", "price": round(wp, 2), "change": round(wc, 2)},
                            {"symbol": "DUBAI", "name": "Dubai (derived)", "price": round(dubai, 2), "change": round(bc, 2)},
                        ],
                        True,
                    )
            except Exception:  # noqa: BLE001 — try the next source
                continue
    return REFERENCE, False


@router.get("/forward-curve")
async def forward_curve() -> dict:
    now = time.time()
    if _CACHE["data"] and now - _CACHE["at"] < _TTL:
        return _CACHE["data"]
    quotes, live = await _fetch_quotes()
    data = {"quotes": quotes, "live": live, "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))}
    if live:  # only cache successful live data — keep retrying on failure
        _CACHE.update(at=now, data=data)
    return data
