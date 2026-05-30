from typing import Optional

from pydantic import BaseModel, EmailStr


class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    org: Optional[str] = None
    tier: str = "Individual"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    org: str
    tier: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class KeyCreate(BaseModel):
    label: str = "API key"


class CheckoutIn(BaseModel):
    tier: str
