#!/usr/bin/env python3
"""Seed demo data into user, care-episode, and chat services.

User and care-episode data are created via HTTP APIs. Chat demo messages are inserted
directly with MIGRATION_DATABASE_URL (audit trigger disabled) so ``changed_at`` reflects
seeded conversation times without a dedicated column or API backdoor.

Environment variables:
  SEED_BEARER_TOKEN        Required (tenant claim or SEED_TENANT_UUID override for all services).
  SEED_ACTIVE_ACTOR        Optional. X-Active-Actor header (default: operator).
  SEED_TENANT_UUID         Optional override; default is the tenant claim on SEED_BEARER_TOKEN.
  USER_API_URL             Optional. Default: http://localhost:8018
  CARE_EPISODE_API_URL     Optional. Default: http://localhost:8015
  CHAT_API_URL             Optional. Default: http://localhost:8001
  SEED_SERVICES            Optional comma list: user,care-episode,chat (default all)

Source chat env for DB access: ``set -a && source .chat.env && set +a``.

Dashboard/profile demo for a signed-in human is copied from catalog template **DEMO-123**
via the CDP UI ``bootstrapDemoWorkspace`` flow (requires WorkOS tier-1 ``demo`` **and**
Authentication ``VALID_ACTORS`` including ``demo`` in the same environment). Keep that
template row seeded. Demo humans also need WorkOS ``patient`` + ``clinician`` tier-1
roles to use Patient/Clinician menus after bootstrap — see authentication ``OPERATIONS.md``
(Demo workspace humans).

Chat and care-episode dashboard DB writes delete existing rows for catalog patient UUIDs
only (``demo_patients.json``); other users' data is left untouched.

``demo_patients.json`` / ``demo_clinicians.json`` top-level ``tenant_uuid`` is documentation
only (usually ``null``). Seed tenant is always ``resolve_seed_tenant_uuid()`` — never the
catalog field.
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
from seed_tenant import resolve_seed_tenant_uuid, warn_if_catalog_tenant_uuid_present

ROOT = Path(__file__).resolve().parents[1]
MONOREPO_ROOT = ROOT.parent
CARE_EPISODE_ROOT = MONOREPO_ROOT / "care-episode"
CATALOG_FILE = CARE_EPISODE_ROOT / "src" / "data" / "demo_patients.json"
CLINICIANS_FILE = CARE_EPISODE_ROOT / "src" / "data" / "demo_clinicians.json"
PATIENT_ROLE = "patient.self"

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
CHAT_CHANNEL_WEB = 1


def _rehome_catalog_clinician_tenants(tenant_uuid: str) -> None:
    """Demo clinicians use stable UUIDs; operator create cannot assign site.clinical."""
    clinicians = _load_clinicians()
    uuids = [clinician["uuid"] for clinician in clinicians["clinicians"]]
    if not uuids:
        return
    psycopg = _require_psycopg()
    with psycopg.connect(migration_database_url("user")) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET tenant_uuid = %s::uuid WHERE uuid = ANY(%s::uuid[])",
                (tenant_uuid, uuids),
            )
            updated = cur.rowcount
        conn.commit()
    print(f"user: re-homed {updated} catalog clinician(s) to tenant {tenant_uuid}")


def _rehome_catalog_demo_tenants(catalog: dict, tenant_uuid: str) -> None:
    """Align existing catalog demo rows with the seeder's platform tenant."""
    patient_uuids = _catalog_patient_uuids(catalog)
    clinicians = _load_clinicians()
    clinician_uuids = [clinician["uuid"] for clinician in clinicians["clinicians"]]
    user_uuids = [*patient_uuids, *clinician_uuids]
    if not user_uuids:
        return

    psycopg = _require_psycopg()
    context_json = json.dumps({"tenant_uuid": tenant_uuid})

    with psycopg.connect(migration_database_url("user")) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET tenant_uuid = %s::uuid WHERE uuid = ANY(%s::uuid[])",
                (tenant_uuid, user_uuids),
            )
            users_updated = cur.rowcount
        conn.commit()

    with psycopg.connect(migration_database_url("care-episode")) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE care_episode_recoveries
                SET tenant_uuid = %s::uuid
                WHERE patient_uuid = ANY(%s::uuid[])
                """,
                (tenant_uuid, patient_uuids),
            )
            recoveries_updated = cur.rowcount
        conn.commit()

    with psycopg.connect(migration_database_url("chat")) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE chat_interactions
                SET context = COALESCE(context, '{}'::jsonb) || %s::jsonb
                WHERE user_uuid = ANY(%s::uuid[])
                """,
                (context_json, patient_uuids),
            )
            interactions_updated = cur.rowcount
        conn.commit()

    print(
        "rehome: aligned catalog demo rows to tenant "
        f"{tenant_uuid} ({users_updated} users, {recoveries_updated} recoveries, "
        f"{interactions_updated} chat interactions)",
    )


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


def _catalog_patient_uuids(catalog: dict) -> list[str]:
    return [patient["uuid"] for patient in _catalog_patients(catalog)]


def _delete_demo_patient_rows(cur, table: str, patient_uuids: list[str], *, column: str = "patient_uuid") -> int:
    if not patient_uuids:
        return 0
    cur.execute(
        f"DELETE FROM {table} WHERE {column} = ANY(%s::uuid[])",
        (patient_uuids,),
    )
    return cur.rowcount


def _clear_demo_chat_for_patients(cur, patient_uuids: list[str]) -> tuple[int, int]:
    if not patient_uuids:
        return 0, 0
    cur.execute(
        """
        DELETE FROM messages
        WHERE chat_interaction_uuid IN (
            SELECT chat_interaction_uuid
            FROM chat_interactions
            WHERE user_uuid = ANY(%s::uuid[])
        )
        """,
        (patient_uuids,),
    )
    messages_deleted = cur.rowcount
    interactions_deleted = _delete_demo_patient_rows(
        cur,
        "chat_interactions",
        patient_uuids,
        column="user_uuid",
    )
    return messages_deleted, interactions_deleted


def _require_psycopg():
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "psycopg is required for chat seed "
            "(e.g. run with chat service deps: cd ../chat && uv run python ../cdp/scripts/seed_demo_platform.py)",
        ) from exc
    return psycopg


def _seed_users(catalog: dict, api_url: str, headers: dict[str, str], tenant_uuid: str) -> None:
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

    _rehome_catalog_clinician_tenants(tenant_uuid)
    print(f"user: {created} created, {updated} updated (tenant {tenant_uuid})")


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


def _seed_care_episode(
    catalog: dict,
    api_url: str,
    headers: dict[str, str],
    tenant_uuid: str,
    now_utc: datetime,
) -> None:
    records_by_id = {record["id"]: record for record in MEDICAL_RECORDS}
    patients = _catalog_patients(catalog)
    for patient in patients:
        clinical = patient["clinical"]
        patient_uuid = patient["uuid"]
        display_code = patient["display_code"]
        persona = clinical_persona_code(patient)
        _request_json(
            "POST",
            f"{api_url}/api/v1/care-episodes/recoveries",
            headers,
            {
                "patient_uuid": patient_uuid,
                "tenant_uuid": tenant_uuid,
                "display_code": display_code,
                "display_name": f"{patient['first_name']} {patient['last_name']}",
                "surgery": clinical["surgery"],
                "procedure_date": clinical["procedureDate"],
                "recovery_id": clinical["recoveryId"],
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

    print(f"care-episode: seeded sessions/records for {len(patients)} catalog patients (tenant {tenant_uuid})")


def _seed_patient_dashboard_db(catalog: dict, now_utc: datetime) -> None:
    """Replace dashboard demo rows for catalog patients via migration role."""
    psycopg = _require_psycopg()
    demo_patient_uuids = _catalog_patient_uuids(catalog)
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
            cur.execute("SET session_replication_role = replica")
            appointments_deleted = _delete_demo_patient_rows(
                cur,
                "care_episode_appointments",
                demo_patient_uuids,
            )
            inbox_deleted = _delete_demo_patient_rows(
                cur,
                "care_episode_inbox_messages",
                demo_patient_uuids,
            )
            cur.executemany(appointment_sql, appointment_rows)
            cur.executemany(message_sql, message_rows)
            cur.execute("SET session_replication_role = origin")
        conn.commit()

    print(
        f"care-episode: cleared {appointments_deleted} appointments and {inbox_deleted} inbox rows "
        f"for {len(demo_patient_uuids)} catalog patients; seeded {len(appointment_rows)} appointments "
        f"and {len(message_rows)} inbox messages via MIGRATION_DATABASE_URL",
    )


def _seed_chat(catalog: dict, tenant_uuid: str, now_utc: datetime) -> None:
    psycopg = _require_psycopg()
    message_rows: list[tuple] = []
    interaction_rows: list[tuple] = []
    interaction_context = json.dumps({"tenant_uuid": tenant_uuid})

    for patient in _catalog_patients(catalog):
        patient_uuid = patient["uuid"]
        interaction_rows.append(
            (
                patient_uuid,
                interaction_context,
                CHAT_SEED_ACTOR_UUID,
                CHAT_SEED_ACTOR_TYPE,
            )
        )
        timeline = _build_transcript_timeline(patient, now_utc)
        for item in timeline:
            sender_type = "patient" if item["role"] == "patient" else "ai_agent"
            sender_uuid = patient_uuid if sender_type == "patient" else None
            message_rows.append(
                (
                    sender_type,
                    sender_uuid,
                    item["content"],
                    CHAT_CHANNEL_WEB,
                    item["changed_at"],
                    CHAT_SEED_ACTOR_UUID,
                    CHAT_SEED_ACTOR_TYPE,
                    patient_uuid,
                )
            )

    interaction_sql = """
        INSERT INTO chat_interactions (
            chat_interaction_uuid,
            user_uuid,
            context,
            changed_by_uuid,
            changed_by_type,
            change_type
        )
        VALUES (uuidv7(), %s::uuid, %s::jsonb, %s::uuid, %s, 1)
    """

    message_sql = """
        INSERT INTO messages (
            chat_interaction_uuid,
            sender_type,
            sender_uuid,
            content,
            channel,
            changed_at,
            changed_by_uuid,
            changed_by_type,
            change_type
        )
        SELECT
            interaction_row.chat_interaction_uuid,
            %s,
            %s::uuid,
            %s,
            %s,
            %s::timestamptz,
            %s::uuid,
            %s,
            1
        FROM chat_interactions AS interaction_row
        WHERE interaction_row.user_uuid = %s::uuid
        ORDER BY interaction_row.changed_at DESC
        LIMIT 1
    """

    demo_patient_uuids = _catalog_patient_uuids(catalog)

    with psycopg.connect(migration_database_url("chat")) as conn:
        with conn.cursor() as cur:
            # ALTER TABLE ... DISABLE TRIGGER is reverted by audit DDL protection; replica role skips DML hooks.
            cur.execute("SET session_replication_role = replica")
            messages_deleted, interactions_deleted = _clear_demo_chat_for_patients(
                cur,
                demo_patient_uuids,
            )
            cur.executemany(interaction_sql, interaction_rows)
            cur.executemany(message_sql, message_rows)
            cur.execute("SET session_replication_role = origin")
        conn.commit()

    print(
        f"chat: cleared {messages_deleted} messages and {interactions_deleted} interactions "
        f"for {len(demo_patient_uuids)} catalog patients; seeded {len(interaction_rows)} interactions "
        f"and {len(message_rows)} messages via MIGRATION_DATABASE_URL "
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
    warn_if_catalog_tenant_uuid_present(catalog, catalog_path=str(CATALOG_FILE))
    clinicians = _load_clinicians()
    warn_if_catalog_tenant_uuid_present(clinicians, catalog_path=str(CLINICIANS_FILE))
    now_utc = datetime.now(timezone.utc)
    tenant_uuid = resolve_seed_tenant_uuid() if services else None

    print(f"Seeding services: {', '.join(sorted(services))}")
    if tenant_uuid:
        print(f"Seed tenant: {tenant_uuid}")
        _rehome_catalog_demo_tenants(catalog, tenant_uuid)
    if "user" in services:
        _seed_users(catalog, urls["user"], headers, tenant_uuid)
    if "care-episode" in services:
        if api_services:
            _seed_care_episode(catalog, urls["care-episode"], headers, tenant_uuid, now_utc)
        _seed_patient_dashboard_db(catalog, now_utc)
    if "chat" in services:
        if not tenant_uuid:
            raise RuntimeError("SEED_BEARER_TOKEN is required to resolve tenant for chat seed")
        _seed_chat(catalog, tenant_uuid, now_utc)
    print("Done.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(str(exc), file=sys.stderr)
        sys.exit(1)
