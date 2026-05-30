from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import ApiKey, User
from ..schemas import KeyCreate
from ..security import generate_api_key, get_current_user, hash_token

router = APIRouter(prefix="/api/keys", tags=["api-keys"])


def _require_enterprise(user: User = Depends(get_current_user)) -> User:
    if user.tier != "Enterprise":
        raise HTTPException(status_code=403, detail="API access is an Enterprise feature")
    return user


@router.get("")
def list_keys(user: User = Depends(_require_enterprise), session: Session = Depends(get_session)):
    rows = session.exec(select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.revoked == False)).all()  # noqa: E712
    return [
        {"id": k.id, "label": k.label, "prefix": k.prefix, "created": k.created_at.date().isoformat(),
         "lastUsed": k.last_used.isoformat() if k.last_used else None}
        for k in rows
    ]


@router.post("")
def create_key(body: KeyCreate, user: User = Depends(_require_enterprise), session: Session = Depends(get_session)):
    token = generate_api_key()
    row = ApiKey(user_id=user.id, label=body.label, prefix=token[:12], key_hash=hash_token(token))
    session.add(row)
    session.commit()
    session.refresh(row)
    # The full token is returned exactly once.
    return {"id": row.id, "label": row.label, "token": token, "created": row.created_at.date().isoformat()}


@router.delete("/{key_id}")
def revoke_key(key_id: int, user: User = Depends(_require_enterprise), session: Session = Depends(get_session)):
    row = session.get(ApiKey, key_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Key not found")
    row.revoked = True
    session.add(row)
    session.commit()
    return {"ok": True}
