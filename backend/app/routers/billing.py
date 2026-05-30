from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from ..config import settings
from ..db import get_session
from ..models import User
from ..schemas import CheckoutIn
from ..security import get_current_user

router = APIRouter(prefix="/api/billing", tags=["billing"])

PRICE_BY_TIER = {
    "Individual": lambda: settings.stripe_price_individual,
    "Institutional": lambda: settings.stripe_price_institutional,
}


def _stripe():
    if not settings.stripe_secret_key:
        # 501 → frontend billing.ts shows its graceful "wiring pending" modal.
        raise HTTPException(status_code=501, detail="Stripe is not configured")
    import stripe  # lazy

    stripe.api_key = settings.stripe_secret_key
    return stripe


@router.post("/checkout")
def checkout(body: CheckoutIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    stripe = _stripe()  # 501 if Stripe isn't configured (frontend shows graceful modal)
    price_getter = PRICE_BY_TIER.get(body.tier)
    if not price_getter or not price_getter():
        raise HTTPException(status_code=400, detail="Tier is not self-serve (use Contact Sales)")
    if not user.stripe_customer_id:
        customer = stripe.Customer.create(email=user.email, name=user.name, metadata={"org": user.org})
        user.stripe_customer_id = customer.id
        session.add(user)
        session.commit()
    sess = stripe.checkout.Session.create(
        mode="subscription",
        customer=user.stripe_customer_id,
        line_items=[{"price": price_getter(), "quantity": 1}],
        success_url=f"{settings.frontend_base_url}/app/settings?checkout=success",
        cancel_url=f"{settings.frontend_base_url}/pricing",
        metadata={"user_id": str(user.id), "tier": body.tier},
    )
    return {"url": sess.url}


@router.post("/portal")
def portal(user: User = Depends(get_current_user)):
    stripe = _stripe()
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account yet")
    sess = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id, return_url=f"{settings.frontend_base_url}/app/settings"
    )
    return {"url": sess.url}


@router.post("/webhook")
async def webhook(request: Request, session: Session = Depends(get_session)):
    stripe = _stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    obj = event["data"]["object"]
    if event["type"] == "checkout.session.completed":
        uid = (obj.get("metadata") or {}).get("user_id")
        tier = (obj.get("metadata") or {}).get("tier")
        if uid and tier:
            user = session.get(User, int(uid))
            if user:
                user.tier = tier
                session.add(user)
                session.commit()
    elif event["type"] in ("customer.subscription.deleted",):
        cust = obj.get("customer")
        user = session.exec(select(User).where(User.stripe_customer_id == cust)).first()
        if user:
            user.tier = "Individual"
            session.add(user)
            session.commit()
    return {"received": True}
