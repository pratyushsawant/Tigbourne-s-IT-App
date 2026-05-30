from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import User
from ..schemas import LoginIn, SignupIn, TokenOut, UserOut
from ..security import (
    TIER_PERMISSIONS,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _token_response(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(str(user.id)),
        user=UserOut(id=user.id, email=user.email, name=user.name, org=user.org, tier=user.tier),
    )


@router.post("/signup", response_model=TokenOut)
def signup(body: SignupIn, session: Session = Depends(get_session)) -> TokenOut:
    if body.tier not in TIER_PERMISSIONS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name or body.email.split("@")[0].title(),
        org=body.org or body.email.split("@")[-1].split(".")[0].title(),
        tier=body.tier,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, session: Session = Depends(get_session)) -> TokenOut:
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(id=user.id, email=user.email, name=user.name, org=user.org, tier=user.tier)
