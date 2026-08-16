from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.config import get_settings
from app.core.deps import get_db
from app.domain.models import User
from app.shared.rate_limit import enforce_rate_limit


router = APIRouter()


def _webhook_rate_limit(request: Request) -> None:
	client_ip = request.client.host if request.client else "unknown"
	key = f"webhook-clerk:{client_ip}"
	enforce_rate_limit(key=key, max_requests=60, window_seconds=60)


def _extract_email(data: dict) -> str:
	emails = data.get("email_addresses") or []
	if emails and isinstance(emails, list):
		first = emails[0]
		candidate = first.get("email_address") if isinstance(first, dict) else None
		if candidate:
			return str(candidate)
	return f"{data.get('id', 'unknown')}@clerk.local"


def _extract_name(data: dict) -> str:
	first_name = str(data.get("first_name") or "").strip()
	last_name = str(data.get("last_name") or "").strip()
	full_name = f"{first_name} {last_name}".strip()
	return full_name or "Clerk User"


@router.post("/clerk")
async def clerk_webhook(
	request: Request,
	_: None = Depends(_webhook_rate_limit),
	svix_id: str | None = Header(default=None, alias="svix-id"),
	svix_timestamp: str | None = Header(default=None, alias="svix-timestamp"),
	svix_signature: str | None = Header(default=None, alias="svix-signature"),
	db: Session = Depends(get_db),
) -> dict[str, str]:
	settings = get_settings()
	if not settings.clerk_webhook_signing_secret:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="CLERK_WEBHOOK_SIGNING_SECRET is not configured.",
		)

	if not svix_id or not svix_timestamp or not svix_signature:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Svix headers.")

	payload = await request.body()
	wh = Webhook(settings.clerk_webhook_signing_secret)

	try:
		event = wh.verify(
			payload,
			{
				"svix-id": svix_id,
				"svix-timestamp": svix_timestamp,
				"svix-signature": svix_signature,
			},
		)
	except WebhookVerificationError as exc:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Clerk webhook signature.") from exc

	event_type = str(event.get("type") or "")
	data = event.get("data") or {}
	clerk_user_id = str(data.get("id") or "").strip()
	if not clerk_user_id:
		return {"status": "ignored", "reason": "missing_clerk_user_id"}

	if event_type == "user.created":
		user = db.scalar(select(User).where(User.clerk_user_id == clerk_user_id))
		if user is None:
			user = User(
				clerk_user_id=clerk_user_id,
				email=_extract_email(data),
				name=_extract_name(data),
				password_hash=None,
			)
			db.add(user)
			db.commit()
		return {"status": "processed", "event": "user.created"}

	if event_type == "user.deleted":
		user = db.scalar(select(User).where(User.clerk_user_id == clerk_user_id))
		if user is not None:
			user.deleted_at = datetime.now(timezone.utc)
			db.add(user)
			db.commit()
		return {"status": "processed", "event": "user.deleted"}

	return {"status": "ignored", "event": event_type or "unknown"}


@router.post("/stripe")
def stripe_webhook_placeholder() -> dict[str, str]:
	return {"status": "not_implemented", "provider": "stripe"}


@router.post("/mercado-pago")
def mercado_pago_webhook_placeholder() -> dict[str, str]:
	return {"status": "not_implemented", "provider": "mercado-pago"}