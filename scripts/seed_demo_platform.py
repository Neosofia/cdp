#!/usr/bin/env python3
"""Seed demo data into user, care-episode, and chat services.

User and care-episode data are created via HTTP APIs. Chat demo transcripts are inserted
directly with MIGRATION_DATABASE_URL (audit trigger disabled) so ``changed_at`` reflects
seeded conversation times without a dedicated column or API backdoor.

Environment variables:
  SEED_BEARER_TOKEN        Required when seeding user or care-episode (not required for chat-only).
  SEED_ACTIVE_ACTOR        Optional. X-Active-Actor header (default: operator).
  USER_API_URL             Optional. Default: http://localhost:8018
  CARE_EPISODE_API_URL     Optional. Default: http://localhost:8015
  CHAT_API_URL             Optional. Default: http://localhost:8001
  SEED_SERVICES            Optional comma list: user,care-episode,chat (default all)

Source chat env for DB access: ``set -a && source .chat.env && set +a``.

Dashboard/profile demo for any operator patient actor is cloned from the catalog template
patient (PAT-2847 / ``care-episode/src/data/demo_patient_template.json``) via
``POST /api/v1/care-episodes/{uuid}/clone-demo`` — keep that template row seeded.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from demo_seed_payload import (
    ALICE_DISPLAY_CODE,
    ALICE_TRANSCRIPT_LINES,
    MEDICAL_RECORDS,
    RECORD_IDS_BY_DISPLAY_CODE,
    SHORT_TRANSCRIPTS,
    clinical_persona_code,
    dashboard_appointments,
    dashboard_inbox_messages,
)
from seed_migration_url import migration_database_url

ROOT = Path(__file__).resolve().parents[1]
MONOREPO_ROOT = ROOT.parent
CARE_EPISODE_ROOT = MONOREPO_ROOT / "care-episode"
CATALOG_FILE = CARE_EPISODE_ROOT / "src" / "data" / "demo_patients.json"
CLINICIANS_FILE = CARE_EPISODE_ROOT / "src" / "data" / "demo_clinicians.json"
PATIENT_ROLE = "patient.self"
CLINICIAN_ROLE = "site.clinical"

def _services_to_seed() -> set[str]:
    raw = os.getenv("SEED_SERVICES", "user,care-episode,chat").strip()
    items = {item.strip() for item in raw.split(",") if item.strip()}
    allowed = {"user", "care-episode", "chat"}
    invalid = items - allowed
    if invalid:
        raise RuntimeError(f"Unsupported services in SEED_SERVICES: {sorted(invalid)}")
    return items


def _api_urls() -> dict[str, str]:
    return {
        "user": os.getenv("USER_API_URL", "http://localhost:8018").rstrip("/"),
        "care-episode": os.getenv("CARE_EPISODE_API_URL", "http://localhost:8015").rstrip("/"),
        "chat": os.getenv("CHAT_API_URL", "http://localhost:8001").rstrip("/"),
    }


CHAT_SEED_ACTOR_UUID = "00000000-0000-7000-8000-000000000000"
CHAT_SEED_ACTOR_TYPE = 2


def _headers(*, required: bool = True) -> dict[str, str]:
    token = os.getenv("SEED_BEARER_TOKEN", "").strip()
    if not token and required:
        raise RuntimeError("SEED_BEARER_TOKEN is required")
    actor = os.getenv("SEED_ACTIVE_ACTOR", "operator").strip() or "operator"
    return {
        "Authorization": f"Bearer {token}",
        "X-Active-Actor": actor,
        "Content-Type": "application/json",
    }


def _request_json(method: str, url: str, headers: dict[str, str], body: dict | None = None) -> tuple[int, dict]:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            data = response.read().decode("utf-8")
            return response.status, json.loads(data) if data else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: HTTP {exc.code} {detail}") from exc


def _load_catalog() -> dict:
    return json.loads(CATALOG_FILE.read_text(encoding="utf-8"))


def _load_clinicians() -> dict:
    return json.loads(CLINICIANS_FILE.read_text(encoding="utf-8"))


def _catalog_patients(catalog: dict) -> list[dict]:
    return list(catalog["patients"])


def _require_psycopg():
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "psycopg is required for chat seed "
            "(e.g. run with chat service deps: cd ../chat && uv run python ../cdp/scripts/seed_demo_platform.py)",
        ) from exc
    return psycopg


def _seed_users(catalog: dict, api_url: str, headers: dict[str, str]) -> None:
    tenant_uuid = os.getenv("SEED_TENANT_UUID", catalog["tenant_uuid"])
    created = 0
    updated = 0
    for patient in catalog["patients"]:
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
        status, _ = _request_json("POST", f"{api_url}/api/v1/users", headers, body)
        if status == 201:
            created += 1
        elif status == 200:
            updated += 1

    clinicians = _load_clinicians()
    clinician_tenant = os.getenv("SEED_TENANT_UUID", clinicians["tenant_uuid"])
    for clinician in clinicians["clinicians"]:
        body = {
            "uuid": clinician["uuid"],
            "idp_id": clinician["idp_id"],
            "tenant_uuid": clinician_tenant,
            "display_code": clinician["display_code"],
            "first_name": clinician["first_name"],
            "last_name": clinician["last_name"],
            "email": clinician["email"],
            "roles": [CLINICIAN_ROLE],
        }
        status, _ = _request_json("POST", f"{api_url}/api/v1/users", headers, body)
        if status == 201:
            created += 1
        elif status == 200:
            updated += 1

    print(f"user: {created} created, {updated} updated (catalog patients + clinicians)")


CHAT_MESSAGE_GAP_SECONDS = 30
CHAT_SESSION_WINDOW_SECONDS = 24 * 60 * 60


def _transcript_lines_for(patient: dict) -> list[tuple[str, str]]:
    persona = clinical_persona_code(patient)
    if persona == ALICE_DISPLAY_CODE:
        return list(ALICE_TRANSCRIPT_LINES)
    return list(SHORT_TRANSCRIPTS.get(persona, SHORT_TRANSCRIPTS["PAT-2912"]))


def _assert_patient_assistant_alternation(lines: list[tuple[str, str]], display_code: str) -> None:
    if not lines:
        raise ValueError(f"{display_code}: transcript is empty")
    if lines[0][0] != "patient":
        raise ValueError(f"{display_code}: transcript must start with patient")
    for idx, (role, _) in enumerate(lines):
        expected = "patient" if idx % 2 == 0 else "assistant"
        if role != expected:
            raise ValueError(f"{display_code} line {idx}: expected {expected}, got {role}")


def _session_start_in_last_day(patient_uuid: str, turn_count: int, now_utc: datetime) -> datetime:
    """Pick a reproducible session start so all turns fit in the last 24 hours."""
    duration_seconds = max(turn_count - 1, 0) * CHAT_MESSAGE_GAP_SECONDS
    latest_start = now_utc - timedelta(seconds=duration_seconds + 60)
    earliest_start = now_utc - timedelta(seconds=CHAT_SESSION_WINDOW_SECONDS)
    if latest_start < earliest_start:
        latest_start = earliest_start

    span_seconds = int((latest_start - earliest_start).total_seconds())
    if span_seconds <= 0:
        return earliest_start

    digest = int.from_bytes(hashlib.sha256(patient_uuid.encode("utf-8")).digest()[:8], "big")
    return earliest_start + timedelta(seconds=digest % span_seconds)


def _build_transcript_timeline(patient: dict, now_utc: datetime) -> list[dict]:
    """Patient, assistant, patient, ... in seed order; +30s per message."""
    patient_uuid = patient["uuid"]
    persona = clinical_persona_code(patient)
    lines = _transcript_lines_for(patient)
    _assert_patient_assistant_alternation(lines, persona)

    session_start = _session_start_in_last_day(patient_uuid, len(lines), now_utc)
    items: list[dict] = []
    for turn_idx, (role, content) in enumerate(lines):
        changed_at = session_start + timedelta(seconds=turn_idx * CHAT_MESSAGE_GAP_SECONDS)
        items.append(
            {
                "role": role,
                "content": content,
                "time": changed_at.strftime("%H:%M"),
                "changed_at": changed_at,
            }
        )
    return items


def _seed_care_episode(catalog: dict, api_url: str, headers: dict[str, str], now_utc: datetime) -> None:
    tenant_uuid = os.getenv("SEED_TENANT_UUID", catalog["tenant_uuid"])
    records_by_id = {record["id"]: record for record in MEDICAL_RECORDS}
    patients = _catalog_patients(catalog)
    for patient in patients:
        clinical = patient["clinical"]
        patient_uuid = patient["uuid"]
        display_code = patient["display_code"]
        persona = clinical_persona_code(patient)
        _request_json(
            "POST",
            f"{api_url}/api/v1/care-episodes/sessions",
            headers,
            {
                "patient_uuid": patient_uuid,
                "tenant_uuid": tenant_uuid,
                "display_code": display_code,
                "display_name": f"{patient['first_name']} {patient['last_name']}",
                "surgery": clinical["surgery"],
                "procedure_date": clinical["procedureDate"],
                "session_id": clinical["sessionId"],
                "risk_level": clinical["risk_level"],
            },
        )

        record_ids = RECORD_IDS_BY_DISPLAY_CODE.get(persona, RECORD_IDS_BY_DISPLAY_CODE.get(display_code, []))
        record_items = [
            {
                "title": records_by_id[record_id]["title"],
                "date": records_by_id[record_id]["date"],
                "type": records_by_id[record_id]["type"],
                "provider": records_by_id[record_id]["provider"],
                "summary": records_by_id[record_id]["summary"],
                "imageKey": records_by_id[record_id]["image_key"],
            }
            for record_id in record_ids
            if record_id in records_by_id
        ]
        _request_json(
            "POST",
            f"{api_url}/api/v1/care-episodes/{patient_uuid}/records",
            headers,
            {"items": record_items},
        )

        transcript_items = [
            {"role": item["role"], "content": item["content"], "time": item["time"]}
            for item in _build_transcript_timeline(patient, now_utc)
        ]
        _request_json(
            "POST",
            f"{api_url}/api/v1/care-episodes/{patient_uuid}/transcript",
            headers,
            {"items": transcript_items},
        )

    print(f"care-episode: seeded sessions/records/transcript for {len(patients)} catalog patients")


def _seed_patient_dashboard_db(catalog: dict, now_utc: datetime) -> None:
    """Truncate and reload dashboard tables via migration role (app role cannot DELETE)."""
    psycopg = _require_psycopg()
    actor_uuid = CHAT_SEED_ACTOR_UUID
    appointment_rows: list[tuple] = []
    message_rows: list[tuple] = []

    for patient in _catalog_patients(catalog):
        patient_uuid = patient["uuid"]
        persona = clinical_persona_code(patient)
        for item in dashboard_appointments(persona, now_utc):
            appointment_rows.append(
                (
                    patient_uuid,
                    item["clinician_user_uuid"],
                    item["clinician_display_name"],
                    item["specialty"],
                    item["scheduled_at"],
                    item["status"],
                    actor_uuid,
                    CHAT_SEED_ACTOR_TYPE,
                )
            )
        for item in dashboard_inbox_messages(persona, now_utc):
            message_rows.append(
                (
                    patient_uuid,
                    item.get("sender_user_uuid"),
                    item["sender_display_name"],
                    item["body"],
                    item.get("read_at"),
                    item["sent_at"],
                    actor_uuid,
                    CHAT_SEED_ACTOR_TYPE,
                )
            )

    appointment_sql = """
        INSERT INTO care_episode_appointments (
            patient_uuid,
            clinician_user_uuid,
            clinician_display_name,
            specialty,
            scheduled_at,
            status,
            changed_by_uuid,
            changed_by_type,
            change_type
        )
        VALUES (%s::uuid, %s::uuid, %s, %s, %s::timestamptz, %s, %s::uuid, %s, 1)
    """
    message_sql = """
        INSERT INTO care_episode_inbox_messages (
            patient_uuid,
            sender_user_uuid,
            sender_display_name,
            body,
            read_at,
            sent_at,
            changed_by_uuid,
            changed_by_type,
            change_type
        )
        VALUES (%s::uuid, %s::uuid, %s, %s, %s::timestamptz, %s::timestamptz, %s::uuid, %s, 1)
    """

    with psycopg.connect(migration_database_url("care-episode")) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE care_episode_appointments_audit")
            cur.execute("TRUNCATE care_episode_inbox_messages_audit")
            cur.execute("TRUNCATE care_episode_appointments")
            cur.execute("TRUNCATE care_episode_inbox_messages")
            cur.executemany(appointment_sql, appointment_rows)
            cur.executemany(message_sql, message_rows)
        conn.commit()

    print(
        f"care-episode: seeded {len(appointment_rows)} appointments and "
        f"{len(message_rows)} inbox messages via MIGRATION_DATABASE_URL",
    )


def _seed_chat(catalog: dict, now_utc: datetime) -> None:
    psycopg = _require_psycopg()
    rows: list[tuple] = []
    for patient in _catalog_patients(catalog):
        patient_uuid = patient["uuid"]
        timeline = _build_transcript_timeline(patient, now_utc)
        for item in timeline:
            sender_type = "patient" if item["role"] == "patient" else "ai_agent"
            sender_uuid = patient_uuid if sender_type == "patient" else None
            rows.append(
                (
                    patient_uuid,
                    patient_uuid,
                    sender_type,
                    sender_uuid,
                    item["content"],
                    item["changed_at"],
                    CHAT_SEED_ACTOR_UUID,
                    CHAT_SEED_ACTOR_TYPE,
                )
            )

    insert_sql = """
        INSERT INTO messages (
            patient_uuid,
            care_episode_uuid,
            sender_type,
            sender_uuid,
            content,
            changed_at,
            changed_by_uuid,
            changed_by_type,
            change_type
        )
        VALUES (%s::uuid, %s::uuid, %s, %s::uuid, %s, %s::timestamptz, %s::uuid, %s, 1)
    """

    with psycopg.connect(migration_database_url("chat")) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE messages_audit")
            cur.execute("TRUNCATE messages")
            # ALTER TABLE ... DISABLE TRIGGER is reverted by audit DDL protection; replica role skips DML hooks.
            cur.execute("SET session_replication_role = replica")
            cur.executemany(insert_sql, rows)
            cur.execute("SET session_replication_role = origin")
        conn.commit()

    print(
        f"chat: seeded {len(rows)} messages via MIGRATION_DATABASE_URL "
        f"(+{CHAT_MESSAGE_GAP_SECONDS}s per turn, changed_at set directly)",
    )


def main() -> None:
    if not CATALOG_FILE.exists():
        raise RuntimeError(f"Missing catalog file: {CATALOG_FILE}")

    services = _services_to_seed()
    api_services = services - {"chat"}
    headers = _headers(required=bool(api_services))
    urls = _api_urls()
    catalog = _load_catalog()
    now_utc = datetime.now(timezone.utc)

    print(f"Seeding services: {', '.join(sorted(services))}")
    if "user" in services:
        _seed_users(catalog, urls["user"], headers)
    if "care-episode" in services:
        if api_services:
            _seed_care_episode(catalog, urls["care-episode"], headers, now_utc)
        _seed_patient_dashboard_db(catalog, now_utc)
    if "chat" in services:
        _seed_chat(catalog, now_utc)
    print("Done.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(str(exc), file=sys.stderr)
        sys.exit(1)
