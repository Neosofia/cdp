"""Resolve the tenant UUID for demo seed scripts from the seeder's JWT.

Demo catalog JSON (``demo_patients.json``, ``demo_clinicians.json``) may include a
top-level ``tenant_uuid`` field for documentation only. Seed scripts never read it;
use ``resolve_seed_tenant_uuid()`` or ``warn_if_catalog_tenant_uuid_present()`` instead.
"""

from __future__ import annotations

import base64
import json
import os
import sys
from typing import Any


def tenant_uuid_from_jwt(token: str, *, claim_namespace: str = "neosofia") -> str:
    """Extract ``{namespace}:tenant_uuid`` from a bearer JWT payload (no signature verify)."""
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise RuntimeError("Bearer token is not a JWT")

    payload_segment = parts[1]
    payload_segment += "=" * (-len(payload_segment) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(payload_segment))
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError("Bearer token JWT payload is not valid JSON") from exc

    claim_key = f"{claim_namespace}:tenant_uuid"
    tenant_uuid = payload.get(claim_key) or payload.get("tenant_uuid")
    if not tenant_uuid or not str(tenant_uuid).strip():
        raise RuntimeError(
            f"JWT missing {claim_key!r}; cannot determine seed tenant for demo users",
        )
    return str(tenant_uuid).strip()


def resolve_seed_tenant_uuid(*, token: str = "", env_prefix: str = "SEED") -> str:
    """
    Tenant for all demo users/sessions created by a seed run.

    Priority: ``{env_prefix}_TENANT_UUID`` override, else tenant claim on the bearer JWT.
    """
    override = os.getenv(f"{env_prefix}_TENANT_UUID", "").strip()
    if override:
        return override

    bearer = token.strip() or os.getenv(f"{env_prefix}_BEARER_TOKEN", "").strip()
    if not bearer:
        raise RuntimeError(
            f"{env_prefix}_BEARER_TOKEN is required to resolve the seed tenant "
            f"(or set {env_prefix}_TENANT_UUID explicitly)",
        )

    namespace = os.getenv("JWT_CLAIM_NAMESPACE", "neosofia").strip() or "neosofia"
    return tenant_uuid_from_jwt(bearer, claim_namespace=namespace)


def warn_if_catalog_tenant_uuid_present(catalog: dict[str, Any], *, catalog_path: str = "") -> None:
    """Emit a visible warning when catalog JSON carries a non-null tenant_uuid (ignored at seed time)."""
    raw = catalog.get("tenant_uuid")
    if raw is None or str(raw).strip() == "":
        return
    label = catalog_path or "demo catalog"
    print(
        f"WARNING: {label} tenant_uuid={raw!r} is NOT USED. "
        "Seed tenant comes from SEED_TENANT_UUID or the SEED_BEARER_TOKEN claim "
        "(see seed_tenant.py).",
        file=sys.stderr,
    )
