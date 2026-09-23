"""Verifies the Rayfin session JWT the frontend attaches to each request.

Rayfin's Fabric SSO doesn't hand the app a delegated Fabric/Entra token, so
this proxy cannot call the Data Agent "as the user" (see DEPLOYMENT.md). What
it *can* do is verify, independently and cryptographically, that the caller
holds a currently-valid Rayfin session for this app, and know exactly who
they are (`sub`/`email`). That's what this module does, using Rayfin's own
JWKS endpoint (Auth.getJwks() on the app side) instead of trusting a shared
secret.
"""

from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient

from .config import get_settings


@dataclass
class CallerIdentity:
    subject: str
    email: str | None


_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(get_settings().rayfin_jwks_url)
    return _jwk_client


def _extract_bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    return header.removeprefix("Bearer ").strip()


async def verify_caller(request: Request) -> CallerIdentity:
    settings = get_settings()
    token = _extract_bearer_token(request)

    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            issuer=settings.rayfin_issuer,
            audience=settings.rayfin_audience,
            options={
                "verify_iss": settings.rayfin_issuer is not None,
                "verify_aud": settings.rayfin_audience is not None,
            },
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid session token: {exc}") from exc

    subject = claims.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Token missing 'sub' claim.")

    return CallerIdentity(subject=subject, email=claims.get("email"))
