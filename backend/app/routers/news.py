import time
from xml.etree import ElementTree as ET

import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/api/news", tags=["news"])

_CACHE: dict = {"at": 0.0, "data": None}
_TTL = 1800  # 30 min
_UA = {"User-Agent": "Mozilla/5.0 (compatible; TigbourneBot/1.0)"}
_RSS = "https://news.google.com/rss/search"
# CEOR-first, then broader oil & gas. `when:30d` keeps it current.
_QUERY = (
    '("enhanced oil recovery" OR CEOR OR "chemical EOR" OR "polymer flooding" OR "oilfield chemicals" '
    'OR "oil and gas" OR "crude oil" OR OPEC) when:30d'
)

# Shown only if the live feed can't be reached (keeps the tab from looking empty in demo/offline).
FALLBACK = [
    {"title": "Connect the backend to see live CEOR & oil-and-gas headlines here.", "url": "/", "source": "Tigbourne", "published": ""},
]


async def _fetch() -> list[dict]:
    params = {"q": _QUERY, "hl": "en-US", "gl": "US", "ceid": "US:en"}
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        r = await client.get(_RSS, params=params, headers=_UA)
        r.raise_for_status()
        root = ET.fromstring(r.text)
        items: list[dict] = []
        for it in root.iterfind(".//item"):
            title = (it.findtext("title") or "").strip()
            link = (it.findtext("link") or "").strip()
            pub = (it.findtext("pubDate") or "").strip()
            source = (it.findtext("source") or "").strip()
            # Google formats titles as "Headline - Source"; drop the trailing source.
            if source and title.endswith(f" - {source}"):
                title = title[: -(len(source) + 3)].strip()
            if title and link:
                items.append({"title": title, "url": link, "source": source, "published": pub})
            if len(items) >= 30:
                break
        return items


@router.get("")
async def news() -> dict:
    now = time.time()
    if _CACHE["data"] and now - _CACHE["at"] < _TTL:
        return _CACHE["data"]
    try:
        items = await _fetch()
        if not items:
            raise RuntimeError("empty feed")
        data = {"items": items, "live": True, "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))}
        _CACHE.update(at=now, data=data)
        return data
    except Exception:  # noqa: BLE001
        return {"items": FALLBACK, "live": False, "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))}
