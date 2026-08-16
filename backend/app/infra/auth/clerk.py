from __future__ import annotations

import json
import threading
import time
from typing import Any

import httpx
import jwt

from app.core.config import get_settings


class ClerkJWTVerifier:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._jwks_cache: dict[str, Any] | None = None
        self._jwks_cached_at = 0.0
        self._lock = threading.Lock()

    def _jwks_url(self) -> str:
        if self._settings.clerk_jwks_url:
            return self._settings.clerk_jwks_url

        issuer = (self._settings.clerk_issuer or "").rstrip("/")
        if not issuer:
            raise ValueError("CLERK_ISSUER or CLERK_JWKS_URL must be configured.")

        return f"{issuer}/.well-known/jwks.json"

    def _load_jwks(self) -> dict[str, Any]:
        ttl = max(60, self._settings.clerk_jwks_cache_ttl_seconds)
        now = time.time()

        with self._lock:
            if self._jwks_cache and (now - self._jwks_cached_at) < ttl:
                return self._jwks_cache

            with httpx.Client(timeout=5.0) as client:
                response = client.get(self._jwks_url())
                response.raise_for_status()
                self._jwks_cache = response.json()
                self._jwks_cached_at = now

            return self._jwks_cache

    def _find_public_key(self, token: str) -> Any:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise ValueError("Token header missing key id.")

        jwks = self._load_jwks()
        keys = jwks.get("keys", [])

        key_data = next((key for key in keys if key.get("kid") == kid), None)
        if not key_data:
            raise ValueError("No matching Clerk public key found for token.")

        return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))

    def verify_token(self, token: str) -> dict[str, Any]:
        issuer = self._settings.clerk_issuer
        if not issuer:
            raise ValueError("CLERK_ISSUER must be configured.")

        try:
            public_key = self._find_public_key(token)
            claims = jwt.decode(
                token,
                key=public_key,
                algorithms=["RS256"],
                issuer=issuer,
                options={"verify_aud": False},
            )
        except jwt.ExpiredSignatureError as exc:
            raise ValueError("Token expired.") from exc
        except jwt.InvalidIssuerError as exc:
            raise ValueError("Invalid token issuer.") from exc
        except jwt.InvalidTokenError as exc:
            raise ValueError("Invalid Clerk token.") from exc

        return claims


_verifier_instance: ClerkJWTVerifier | None = None


def get_clerk_verifier() -> ClerkJWTVerifier:
    global _verifier_instance
    if _verifier_instance is None:
        _verifier_instance = ClerkJWTVerifier()
    return _verifier_instance