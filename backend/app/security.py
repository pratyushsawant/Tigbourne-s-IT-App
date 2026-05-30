from typing import Optional
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlmodel import Session, select

from .config import settings
from .db import get_session
from .models import ApiKey, User

bearer = HTTPBearer(auto_error=False)
_PBKDF2_ROUNDS = 200_000

# Mirror of the frontend tier → permission map (AuthContext).
TIER_PERMISSIONS: dict[str, set[str]] = {
    "Individual": set(),
    "Institutional": {"economics", "export"},
    "Enterprise": {"economics", "export", "dataIntegrity"},
}


def hash_password(p: str) -> str:
    """PBKDF2-HMAC-SHA256 with a random salt — stdlib only. Stored as 'salt$hash'.
    Swap for argon2/bcrypt in production if desired."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", p.encode(), salt, _PBKDF2_ROUNDS)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(p: str, stored: str) -> bool:
    try:
        salt_hex, hash_hex = stored.split("$", 1)
        dk = hashlib.pbkdf2_hmac("sha256", p.encode(), bytes.fromhex(salt_hex), _PBKDF2_ROUNDS)
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(dk.hex(), hash_hex)


def create_access_token(sub: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": sub, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    session: Session = Depends(get_session),
) -> User:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_permission(permission: str):
    def dep(user: User = Depends(get_current_user)) -> User:
        if permission not in TIER_PERMISSIONS.get(user.tier, set()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your {user.tier} plan does not include '{permission}'",
            )
        return user

    return dep


# --- API keys (the external programmatic product) ---
def generate_api_key() -> str:
    return "tig_live_" + secrets.token_hex(16)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def get_api_key_user(
    x_api_key: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    if not x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-API-Key")
    row = session.exec(
        select(ApiKey).where(ApiKey.key_hash == hash_token(x_api_key), ApiKey.revoked == False)  # noqa: E712
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    row.last_used = datetime.utcnow()
    session.add(row)
    session.commit()
    user = session.get(User, row.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Key owner not found")
    return user
