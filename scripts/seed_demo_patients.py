#!/usr/bin/env python3
"""Seed CDP demo patients into the user service via POST /api/v1/users.

Reads care-episode/src/data/demo_patients.json and creates patient.self users with stable
UUIDs. Re-running updates existing rows when the create endpoint supports uuid upsert.

Environment:

  USER_API_URL              User service base URL (default http://localhost:8018)
  USER_SEED_BEARER_TOKEN    Bearer token for a platform admin operator in the target tenant
  USER_SEED_ACTIVE_ACTOR    X-Active-Actor header (default operator)
  DEMO_PATIENTS_TENANT_UUID Tenant to seed (defaults to catalog tenant_uuid)

Example:

  export USER_SEED_BEARER_TOKEN="$(your-token)"
  export DEMO_PATIENTS_TENANT_UUID=019e02e1-94e1-722b-bd61-f7f95fb1601f
  python scripts/seed_demo_patients.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT.parent / "care-episode" / "src" / "data" / "demo_patients.json"
PATIENT_ROLE = "patient.self"


def load_patients() -> tuple[str, list[dict]]:
    payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    tenant_uuid = os.getenv("DEMO_PATIENTS_TENANT_UUID", payload["tenant_uuid"])
    return tenant_uuid, payload["patients"]


def api_base_url() -> str:
    return os.getenv("USER_API_URL", "http://localhost:8018").rstrip("/")


def seed_headers() -> dict[str, str]:
    token = os.getenv("USER_SEED_BEARER_TOKEN", "").strip()
    if not token:
        print("USER_SEED_BEARER_TOKEN is required.", file=sys.stderr)
        sys.exit(1)
    actor = os.getenv("USER_SEED_ACTIVE_ACTOR", "operator").strip() or "operator"
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Active-Actor": actor,
    }


def create_patient(api_url: str, headers: dict[str, str], tenant_uuid: str, patient: dict) -> tuple[int, dict]:
    body = {
        "uuid": patient["uuid"],
        "idp_id": patient["idp_id"],
        "tenant_uuid": tenant_uuid,
        "display_code": patient["display_code"],
        "first_name": patient["first_name"],
        "last_name": patient["last_name"],
        "email": patient["email"],
        "roles": [PATIENT_ROLE],
    }
    request = urllib.request.Request(
        f"{api_url}/api/v1/users",
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return response.status, payload
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        try:
            message = json.loads(detail)
        except json.JSONDecodeError:
            message = {"error": detail or exc.reason}
        raise RuntimeError(f"HTTP {exc.code}: {message}") from exc


def main() -> None:
    if not DATA_FILE.is_file():
        print(f"Missing patient catalog: {DATA_FILE}", file=sys.stderr)
        sys.exit(1)

    tenant_uuid, patients = load_patients()
    api_url = api_base_url()
    headers = seed_headers()
    print(f"Seeding {len(patients)} demo patients via {api_url}")
    print(f"Tenant: {tenant_uuid}\n")

    created = 0
    updated = 0
    for patient in patients:
        status, item = create_patient(api_url, headers, tenant_uuid, patient)
        if status == 201:
            created += 1
            action = "created"
        elif status == 200:
            updated += 1
            action = "updated"
        else:
            action = f"status {status}"
        print(
            f"  {action}: {patient['display_code']}  "
            f"{patient['first_name']} {patient['last_name']}  "
            f"({item.get('uuid', patient['uuid'])})"
        )

    print(f"\nDone ({created} created, {updated} updated).")
    if tenant_uuid != json.loads(DATA_FILE.read_text(encoding="utf-8"))["tenant_uuid"]:
        print("DEMO_PATIENTS_TENANT_UUID overrides the catalog default tenant.")


if __name__ == "__main__":
    main()
