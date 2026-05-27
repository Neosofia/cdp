# Feature Specification: Care Episode Service

**Feature Branch**: `015-care-episode-service`
**Created**: April 18, 2026
**Status**: Draft

## Overview

A care episode is the platform's fundamental unit of post-discharge care: it groups a patient, a specific procedure or discharge event from the EMR, and all associated chat interactions into a single bounded context. A patient may have many care episodes over their lifetime on the platform — one per procedure — each with its own care window, its own chat history, and its own clinical context. This service is the authoritative source of truth for that grouping.

Without this service, nothing on the platform can answer the question: *"Which chats, alerts, and EMR context belong to this patient's April 1st procedure versus their July 15th procedure?"*

---

## User Scenarios & Testing

### User Story 1 - Clinician Invites a Patient for Procedure Post-Care (Priority: P1)

A clinician initiates post-discharge care monitoring through a single action: *Invite patient XYZ for post-care monitoring for procedure ABC*. This action is the sole entry point into the platform for a patient — there is no separate "create episode" step. When the clinician submits the invite, the Care Episode Service atomically creates a care episode (anchored to the patient and procedure) and generates an invite token that encodes the episode ID. When the patient registers using that token, their account is immediately and unambiguously associated with the correct episode.

**Why this priority**: The invite is the root event of the entire patient care workflow. The care episode, the patient's platform account, and all subsequent chat interactions are downstream of this single clinician action.

**Independent Test**: Can be fully tested by issuing an invite with a valid patient ID, procedure reference, and care window, verifying that a care episode is created with status `active` and an invite token is returned encoding the episode ID, then completing patient registration with the token and verifying the patient record is linked to the correct episode.

**Acceptance Scenarios**:

1. **Given** an authenticated clinician with a valid patient ID, EMR procedure reference, and care window duration, **When** they issue an invite, **Then** a care episode is created with status `active`, a care window expiry timestamp is set, and an invite token encoding the episode ID is returned
2. **Given** a clinician issues an invite without specifying a care window duration, **When** the invite is processed, **Then** the system applies the default care window for the given procedure type (30 days)
3. **Given** a patient already has an active care episode for the same patient ID and procedure reference, **When** a clinician attempts to issue a new invite, **Then** the request is rejected and the existing episode ID is returned in the response
4. **Given** a patient completes registration with an invite token, **When** the patient service calls the Care Episode Service to confirm association, **Then** the episode record is updated to link the patient ID and the invite is marked consumed
5. **Given** a patient attempts to register with an invite token that references a closed or expired episode, **When** the association is attempted, **Then** the registration is rejected

---

### User Story 2 - Chat Service Looks Up a Patient's Active Episode (Priority: P1)

When a patient sends a message, the chat service must know which care episode to associate the new `ChatInteraction` with. It queries the Care Episode Service for the patient's current episode. Because every registered patient entered the platform through a procedure-scoped invite, they will always have at least one care episode. If a patient has multiple active episodes (overlapping procedure windows), the most recently opened episode is used. Multi-episode selection is out of scope for this version.

**Why this priority**: The `ChatInteraction` foreign key to `care_episode_id` is required on every message. The chat service cannot open a new interaction without this lookup.

**Independent Test**: Can be fully tested by creating two overlapping active episodes for a patient and verifying the lookup returns the most recently opened one; then creating a patient with a single active episode and verifying the correct episode is returned.

**Acceptance Scenarios**:

1. **Given** a patient with exactly one active care episode, **When** the active-episode lookup is called for that patient ID, **Then** that episode is returned
2. **Given** a patient has multiple simultaneously active care episodes (overlapping procedure windows), **When** the active-episode lookup is called, **Then** the most recently opened episode is returned
3. **Given** a patient has no active care episode (all episodes closed or expired), **When** the active-episode lookup is called, **Then** a not-found response is returned — this is an exceptional state indicating all care windows have closed, and the chat service MUST reject the inbound message with an appropriate patient-facing explanation

---

### User Story 3 - Care Window Expires and Episode Auto-Closes (Priority: P2)

When a care episode's care window expiry timestamp passes with no explicit extension, the episode is automatically transitioned to `closed` status by a daily scheduled job, the closure reason is recorded as `care-window-expired`, and a lifecycle event is emitted to the platform event bus.

**Why this priority**: Without automatic closure, the platform would accumulate stale open episodes. Downstream services (chat, notifications) rely on the active-episode lookup returning correct results.

**Independent Test**: Can be fully tested by creating an episode with a very short care window in a test environment, advancing the clock past the expiry, triggering the closure job, and verifying the episode status is `closed` with the correct closure reason.

**Acceptance Scenarios**:

1. **Given** a care episode's care window expiry timestamp has passed, **When** the scheduled closure job runs, **Then** the episode status transitions to `closed`, closure reason is set to `care-window-expired`, closed timestamp is recorded, and a `care_episode.closed` event is emitted
2. **Given** a clinician manually closes an episode before expiry, **When** the closure request is processed, **Then** the episode status transitions to `closed`, closure reason is set to `clinician-closed`, the clinician's identity is recorded as the closing actor, and a `care_episode.closed` event is emitted
3. **Given** an episode is already closed, **When** the scheduled closure job encounters it, **Then** it is skipped without modification

---

### Edge Cases

- What happens when a patient has two overlapping active episodes (e.g., two separate procedures 15 days apart, each with a 30-day window)? The most recently opened episode is used. Multi-episode selection is out of scope for this version.
- What happens when a clinician extends the care window before it expires? Care window extension is out of scope for this version; no UI or endpoint is planned.

## Requirements

### Functional Requirements

- **FR-001**: The service MUST accept an authenticated invite request specifying the patient ID, an EMR procedure reference, care window duration in days, and procedure type; the service MUST atomically create a care episode with status `active` and return the episode ID and invite token in a single response
- **FR-002**: The service MUST reject an invite request where an active care episode already exists for the same patient ID and EMR procedure reference; the existing episode ID MUST be returned in the rejection response
- **FR-003**: The service MUST expose an active-episode lookup endpoint that returns the single active care episode for a given patient ID; if no active episode exists, the response MUST indicate not-found (not an error)
- **FR-004**: The service MUST expose an episode list endpoint that returns all care episodes for a patient ID in reverse chronological order, including closed and expired episodes; each record MUST include procedure reference, care window, and status (presentation of this data in the clinician UI is specified in `008-clinician-app`)
- **FR-005**: The service MUST expose an episode detail endpoint that returns the full episode record by episode ID (presentation is specified in `008-clinician-app`)
- **FR-006**: The service MUST automatically close care episodes whose care window expiry timestamp has passed; closure MUST be processed by a scheduled job running at least daily; the closure reason MUST be set to `care-window-expired`
- **FR-007**: The service MUST accept an authenticated request to manually close an active episode; closure reason MUST be set to `clinician-closed` and the caller's identity recorded
- **FR-008**: The service MUST accept an authenticated admin request to close an active episode; closure reason MUST be set to `admin-closed` and the caller's identity recorded
- **FR-009**: *(out of scope for v1)* Care window extension by clinicians is not supported in this version; no endpoint or UI is provided
- **FR-010**: The service MUST emit a `care_episode.opened` event on creation and a `care_episode.closed` event on closure (any reason) to the platform event bus; event payloads MUST NOT contain PHI — only episode ID, patient ID (UUID), procedure type, closure reason, and timestamps
- **FR-011**: The service MUST expose an endpoint allowing the patient service to confirm patient-to-episode association after successful registration; this endpoint updates the episode record with the patient ID and marks the invite as consumed
- **FR-012**: The service MUST reject all requests from unauthenticated or unauthorized callers

### Key Entities

- **CareEpisode**: Episode UUID (PK), patient ID (FK → Patient Service), tenant ID, EMR procedure reference (FK → EMR Service), procedure type, care window days, care window expiry timestamp, status (`active` / `closed`), closure reason (`care-window-expired` / `clinician-closed` / `admin-closed`; null if active), closed timestamp (null if active), closed by (clinician/admin identity or `system`; null if active), created timestamp, last activity timestamp.
- **AuditEvent**: Event ID, actor identity, episode UUID, operation type (`create` / `close` / `extend` / `associate-patient`), timestamp, outcome.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Active-episode lookup p99 latency ≤ 50 ms (on the critical path for every inbound chat message)
- **SC-002**: Zero chat interactions are stored without a valid care episode association, verified by automated referential integrity tests
- **SC-003**: All `care_episode.opened` and `care_episode.closed` events are emitted within 500 ms of the triggering operation, verified by event bus integration tests
- **SC-004**: Latency and throughput SLOs are governed by `011-operational-metrics` and are not duplicated here

## Assumptions

- A patient may have multiple care episodes over their lifetime — one per procedure or discharge event — and multiple episodes may be simultaneously active if procedures overlap; the platform handles this at the application layer
- Care episode creation is always initiated by a human clinician or an admin; the system does not automatically create episodes based on EMR events in this iteration (EMR-triggered auto-enrolment is deferred)
- The care window duration default (30 days) is configurable per procedure type at the tenant level; the default is applied when no explicit duration is provided at creation time
- The EMR procedure reference is a FHIR resource ID or Encounter ID from the EMR service (004); this service does not call the EMR service directly but stores the reference for other services to resolve
- The Chat Service is responsible for calling the active-episode lookup before opening a new `ChatInteraction`; this service does not push episodes to the chat service
- Authentication is provided by the Authentication Service (`014-authentication-service`); authorization decisions are made by the Authorization Service (`016-authorization-service`); this service trusts the authenticated identity and access control decision asserted by the API gateway
- This service handles data that may be PHI-adjacent (patient ID + procedure type together could constitute PHI); all storage is encrypted at rest and in transit
- Latency and throughput SLOs are defined in `011-operational-metrics`
