from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from .config import settings
from .db import engine, init_db
from .routers import auth, billing, data, ingest, keys, prices
from .scheduler import start_scheduler
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with Session(engine) as session:
        seed_if_empty(session)
    task = start_scheduler()  # auto re-sync the sheet if configured
    yield
    if task:
        task.cancel()


app = FastAPI(
    title="Tigbourne Oil Field Intelligence API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router)
app.include_router(data.external)
app.include_router(auth.router)
app.include_router(keys.router)
app.include_router(billing.router)
app.include_router(prices.router)
app.include_router(ingest.router)


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}
