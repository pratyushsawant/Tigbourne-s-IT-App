import time
from datetime import datetime

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


# --- Forward / forecast curve (term structure) -------------------------------------------------
# EIA STEO publishes a monthly Brent/WTI price forecast (~2 years). Dubai is derived per month.
_STEO = (
    "https://api.eia.gov/v2/steo/data/?api_key={key}&frequency=monthly&data[]=value"
    "&facets[seriesId][]=BREPUUS&facets[seriesId][]=WTIPUUS&start={start}"
    "&sort[0][column]=period&sort[0][direction]=asc&length=60"
)
# Annual Brent forward shape (matches FORWARD_CURVE in the frontend economics) — offline fallback.
_SHAPE = [
    62.78, 62.33, 63.54, 65.02, 66.2, 66.92, 67.46, 67.73, 67.74, 67.74, 67.74, 67.74, 67.74,
    67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74, 67.74,
]
_FWD_CACHE: dict = {"at": 0.0, "data": None}
_FWD_TTL = 12 * 3600  # STEO is monthly — cache 12h


async def _steo_curve(client: httpx.AsyncClient) -> list[dict]:
    if not settings.eia_api_key:
        raise RuntimeError("no EIA key")
    start = datetime.utcnow().strftime("%Y-%m")
    r = await client.get(_STEO.format(key=settings.eia_api_key, start=start))
    r.raise_for_status()
    by_period: dict[str, dict] = {}
    for row in r.json()["response"]["data"]:
        val = row.get("value")
        if val is None:
            continue
        d = by_period.setdefault(row["period"], {})
        if row["seriesId"] == "BREPUUS":
            d["brent"] = float(val)
        elif row["seriesId"] == "WTIPUUS":
            d["wti"] = float(val)
    months = []
    for period in sorted(by_period):
        d = by_period[period]
        if "brent" not in d or "wti" not in d:
            continue
        months.append({
            "period": period,
            "brent": round(d["brent"], 2),
            "wti": round(d["wti"], 2),
            "dubai": round(d["brent"] - settings.dubai_differential, 2),
        })
    if not months:
        raise RuntimeError("STEO returned no usable rows")
    return months


def _shape_ratio(month_index: int) -> float:
    y = month_index / 12
    i = min(int(y), len(_SHAPE) - 2)
    frac = y - i
    r0, r1 = _SHAPE[i] / _SHAPE[0], _SHAPE[i + 1] / _SHAPE[0]
    return r0 + frac * (r1 - r0)


def _fallback_curve(quotes: list[dict]) -> list[dict]:
    """Anchor the embedded forward shape to current spot for each benchmark (renders offline)."""
    spot = {q["symbol"]: q["price"] for q in quotes}
    brent, wti = spot.get("BRENT", 75.0), spot.get("WTI", 71.2)
    now = datetime.utcnow()
    months = []
    for m in range(24):
        idx = (now.month - 1) + m
        period = f"{now.year + idx // 12}-{idx % 12 + 1:02d}"
        ratio = _shape_ratio(m)
        b = round(brent * ratio, 2)
        months.append({"period": period, "brent": b, "wti": round(wti * ratio, 2), "dubai": round(b - settings.dubai_differential, 2)})
    return months


@router.get("/forward")
async def forward() -> dict:
    now = time.time()
    if _FWD_CACHE["data"] and now - _FWD_CACHE["at"] < _FWD_TTL:
        return _FWD_CACHE["data"]
    months, live, source = None, False, "shape"
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
            months = await _steo_curve(client)
            live, source = True, "EIA STEO"
    except Exception:  # noqa: BLE001
        months = None
    if not months:
        quotes, _ = await _fetch_quotes()
        months = _fallback_curve(quotes)
    data = {"months": months, "live": live, "source": source, "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))}
    if live:
        _FWD_CACHE.update(at=now, data=data)
    return data


@router.get("/debug")
async def debug() -> dict:
    """Diagnostic: which price sources work from this host, and is the EIA key present?
    Never leaks the key — it's redacted from any error text and only reported as a boolean."""
    def scrub(msg: str) -> str:
        return msg.replace(settings.eia_api_key, "***") if settings.eia_api_key else msg

    out: dict = {"eia_key_present": bool(settings.eia_api_key), "sources": {}}
    async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
        for name, fn in (("eia", _eia), ("fred", _fred), ("yahoo", _yahoo), ("stooq", _stooq)):
            try:
                q = await fn(client)
                ok = bool(q.get("BRENT") and q.get("WTI"))
                out["sources"][name] = {"ok": ok, "brent": (q.get("BRENT") or (None,))[0]}
            except Exception as e:  # noqa: BLE001
                out["sources"][name] = {"ok": False, "error": scrub(f"{type(e).__name__}: {str(e)[:150]}")}
        try:
            m = await _steo_curve(client)
            out["sources"]["steo"] = {"ok": True, "months": len(m)}
        except Exception as e:  # noqa: BLE001
            out["sources"]["steo"] = {"ok": False, "error": scrub(f"{type(e).__name__}: {str(e)[:150]}")}
    return out


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
