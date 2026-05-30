from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class OilFieldRow(SQLModel, table=True):
    """One oil field, scoped to a dataset version (so we can roll back ingests)."""

    row_pk: Optional[int] = Field(default=None, primary_key=True)
    version: int = Field(index=True)
    id: int = Field(index=True)  # field id within the dataset

    region: str
    country: str
    operator: str
    oilfield: str

    oilBblPerDay: Optional[float] = None
    numWells: Optional[float] = None
    bblPerWell: Optional[float] = None
    waterBblPerDay: Optional[float] = None
    liquidBblPerDay: Optional[float] = None
    waterCut: Optional[float] = None
    declinePct: Optional[float] = None
    liftCost: Optional[float] = None
    bht: Optional[float] = None
    tds: Optional[float] = None
    api: Optional[float] = None
    shore: str = "Unknown"
    depthFt: Optional[float] = None
    drillCost: Optional[float] = None
    wellsPerYear: Optional[float] = None
    sulfur: Optional[float] = None
    porosity: Optional[float] = None
    permeability: Optional[float] = None
    resPh: Optional[float] = None
    pa: Optional[float] = None


class DatasetVersion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source: str = "seed"  # seed | google | xlsx
    rows: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_current: bool = Field(default=False, index=True)
    integrity_json: str = "{}"  # {auditHeaders, audit, mismatchHeaders, mismatches}


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    name: str = "Analyst"
    org: str = ""
    tier: str = "Individual"  # Individual | Institutional | Enterprise
    stripe_customer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApiKey(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    label: str = "API key"
    prefix: str  # first chars, shown in UI
    key_hash: str = Field(index=True)  # sha256 of the full token
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None
    revoked: bool = False
