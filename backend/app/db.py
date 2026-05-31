from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import settings

# Render/Heroku hand out postgres:// URLs; SQLAlchemy needs postgresql://.
db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
engine = create_engine(db_url, echo=False, connect_args=connect_args)


def init_db() -> None:
    # Import models so SQLModel registers the tables before create_all.
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
