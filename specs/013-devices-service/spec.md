# Feature Specification: Devices Service

**Feature Branch**: `013-devices-service`
**Created**: April 18, 2026
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient Registers a Mobile Device (Priority: P1)

A patient installs the patient chat app on an iOS or Android device for the first time (or after reinstalling). The app obtains a device push token from the platform (APNS or FCM) and registers it with the Devices service, receiving an opaque device UUID in return. All subsequent platform operations reference the device UUID rather than the raw token.

**Why this priority**: Push delivery to patients depends entirely on having a valid, up-to-date device registration. Without this, the patient receives no in-app notifications and reconnection after backgrounding fails silently.

**Independent Test**: Can be fully tested by submitting a valid push token with patient identity credentials and verifying a device UUID is returned, the registration is stored, and a subsequent lookup by UUID returns the correct record.

**Acceptance Scenarios**:

1. **Given** an authenticated patient with a valid APNS or FCM token, **When** they register the device, **Then** a device UUID is returned and the registration is stored with encrypted raw token, patient ID, platform, and timestamp
2. **Given** a patient registers the same raw token a second time (e.g., app reinstall), **When** the token already exists for that patient, **Then** the existing registration is updated (idempotent upsert) and the same device UUID is returned
3. **Given** a patient registers a new token on a device that previously had a different token (token rotation), **When** the new token is submitted with the same device UUID, **Then** the raw token is updated and the device UUID is unchanged
4. **Given** an unauthenticated request attempts to register a device, **When** the request arrives without valid credentials, **Then** the request is rejected with no registration created

---

### User Story 2 - Devices Service Dispatches a Push Notification on Behalf of a Caller (Priority: P1)

An internal platform service (notification dispatch, SMS service) needs to send a push notification to a specific patient or clinician device. It holds a device UUID and a notification payload and calls the Devices service to perform delivery. The Devices service decrypts the raw token internally, selects the correct provider (APNS, FCM, or Web Push), calls the provider, and returns the delivery outcome. No raw token ever leaves the Devices service.

**Why this priority**: Token containment is structurally enforced by making the Devices service the sole caller of push provider APIs. Raw tokens are never placed on any network path outside this service, eliminating an entire class of leakage risk.

**Independent Test**: Can be fully tested by registering a device, then submitting a push dispatch request with the resulting device UUID and a test payload; verify the provider call is made using the correct token, a delivery outcome is returned, and no raw token appears in any log or response.

**Acceptance Scenarios**:

1. **Given** an authenticated notification-service caller with a valid device UUID and notification payload, **When** they request push dispatch, **Then** the Devices service decrypts the token internally, calls the appropriate provider, and returns the delivery outcome
2. **Given** a device UUID for a registration that has been deactivated, **When** push dispatch is requested, **Then** a response indicating the registration is inactive is returned and no provider call is made
3. **Given** a caller without notification-service role, **When** they request push dispatch, **Then** the request is denied and no provider call is made
4. **Given** the provider reports the token as invalid in its response, **When** the dispatch call completes, **Then** the registration is automatically marked stale and the delivery failure outcome is returned to the caller

---

### User Story 3 - Clinician Registers for Web Push Notifications (Priority: P2)

A clinician using the clinician web app grants browser notification permission. The app generates a Web Push subscription object (endpoint + keys) and registers it with the Devices service.

**Why this priority**: Clinicians must receive real-time escalation alerts in the browser; Web Push registration is a prerequisite.

**Independent Test**: Can be fully tested by submitting a Web Push subscription object with clinician credentials and verifying the subscription is stored, a device UUID is returned, and a subsequent resolution call retrieves the correct object.

**Acceptance Scenarios**:

1. **Given** an authenticated clinician with a browser Web Push subscription object, **When** they register, **Then** a device UUID is returned and the subscription is stored encrypted
2. **Given** a clinician revokes browser notification permission, **When** the app deregisters the subscription, **Then** the registration is marked inactive and the device UUID is no longer resolvable

---

### User Story 4 - Device Registration Deactivated on Patient Account Deactivation (Priority: P1)

When a patient account is deactivated or deleted, all device registrations associated with that patient must be hard-deleted to prevent push delivery to a former patient and to honor data minimization obligations.

**Why this priority**: Retaining device tokens after account termination is a HIPAA/privacy violation and could result in PHI being pushed to an inactive account.

**Independent Test**: Can be fully tested by deactivating a patient account via the patient service event, then verifying all device registrations for that patient are absent from the Devices service.

**Acceptance Scenarios**:

1. **Given** a patient account deactivation event is received, **When** the event is processed, **Then** all device registrations associated with that patient ID are hard-deleted
2. **Given** a push-service token resolution request for a hard-deleted registration, **When** the request is processed, **Then** a not-found response is returned and no data is disclosed

---

### Edge Cases

- What happens when APNS or FCM reports a token as invalid (provider feedback)? The registration should be marked stale/inactive and the owning app notified; the record is retained for audit purposes.
- What happens if two patients register the same raw token (e.g., shared device)? The system should flag and reject the second registration; a raw token may be associated with only one identity at a time.
- What happens when a clinician logs out and logs back in on the same browser? The Web Push subscription object is re-registered; the existing device UUID is reused or a new one created depending on whether the subscription endpoint changed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST accept device registration requests from authenticated patients and clinicians, storing the raw push token or Web Push subscription object encrypted at rest, and returning an opaque device UUID
- **FR-002**: Device registration MUST be an idempotent upsert keyed on the combination of user identity and raw token/endpoint; re-registering the same token for the same user MUST return the existing device UUID without creating a duplicate
- **FR-003**: The service MUST support token rotation: given a device UUID and a new raw token, the stored token MUST be updated and the device UUID MUST remain unchanged
- **FR-004**: The service MUST expose a push dispatch endpoint that accepts a device UUID and notification payload from callers presenting a notification-service role credential; the service MUST internally decrypt the raw token, select the correct push provider (APNS, FCM, or Web Push), call the provider, and return the delivery outcome; all other callers MUST be denied; the raw token MUST NOT appear in any request, response, or log outside this service
- **FR-005**: Raw push tokens and Web Push subscription objects MUST be encrypted at the field level (not solely relying on RDS at-rest encryption); the encryption key MUST be managed via AWS KMS and MUST NOT be accessible to application-layer services
- **FR-006**: The device UUID MUST be the only device identifier surfaced to all services outside of this service; raw tokens MUST NOT appear in any other service's data store, logs, or error traces; this is structurally enforced because the Devices service is the sole caller of push provider APIs and never returns raw tokens to any caller
- **FR-007**: The service MUST hard-delete all device registrations for a patient when a patient account deactivation or deletion event is received; the deletion MUST be processed within 60 seconds of event receipt
- **FR-008**: The service MUST allow a device registration to be explicitly deactivated (soft-delete) without hard-deleting, to support scenarios such as the patient logging out without account deletion
- **FR-009**: The service MUST reject all requests from unauthenticated or unauthorized callers
- **FR-010**: The service MUST emit an audit log entry for every registration create, update, deactivation, hard-delete, and token resolution event; audit entries MUST NOT contain raw token values

### Key Entities

- **DeviceRegistration**: Device UUID (system-generated PK), user ID (patient or clinician), user type (`patient` / `clinician`), platform (`ios` / `android` / `web`), raw push token or Web Push subscription object (encrypted at rest via KMS; never surfaced outside this service), token fingerprint (non-reversible hash used for duplicate detection without exposing the raw value), provider feedback status (`active` / `stale` / `invalid`), registered timestamp, last updated timestamp, active flag.
- **DeviceSession**: Session UUID (PK), device UUID (FK → DeviceRegistration), user ID, platform, biometric-auth-enabled flag (mobile only; null for web), session token reference (FK → Auth Service session), session started timestamp, last activity timestamp, active flag. One user may have multiple concurrent active sessions across form factors.
- **AuditEvent**: Event ID, actor identity, device UUID (never raw token), operation type (`register` / `update` / `deactivate` / `delete` / `dispatch`), timestamp, outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero raw push tokens appear in any service's data store, log stream, or error trace outside the Devices service, verified by automated cross-service log scanning in CI; this is structurally guaranteed by the push-proxy design
- **SC-002**: Push dispatch request acceptance and internal processing (excluding provider round-trip) p99 latency ≤ 50 ms under normal load
- **SC-003**: Patient account deactivation hard-deletes all associated device registrations within 60 seconds of event receipt for 100% of test cases
- **SC-004**: Duplicate registration submissions produce exactly one stored record and return the same device UUID for 100% of test cases
- **SC-005**: Latency and throughput SLOs are governed by `011-operational-metrics` and are not duplicated here

## Assumptions

- Raw device tokens (APNS, FCM) and Web Push subscription objects are classified as PII; they are treated as PHI-adjacent because they can be used to identify a device associated with a patient
- Authentication of callers is provided by the Authentication Service (`014-authentication-service`); authorization decisions are made by the Authorization Service (`016-authorization-service`); this service trusts the authenticated identity and access control decision asserted by the API gateway
- The notification-service role is a machine identity issued to the notification service and SMS service only; no human user or app holds this role
- APNS, FCM, and Web Push API credentials are held exclusively by this service; no other service in the platform holds or requires push provider credentials
- The patient service is the source of truth for patient account lifecycle events; this service listens for deactivation/deletion events from the patient service via the platform event bus
- KMS key policy restricts decryption to this service's execution role only; no other IAM principal may decrypt stored tokens
- Web Push subscription objects (endpoint + p256dh key + auth key) are treated as equivalent in sensitivity to mobile push tokens and are subject to the same encryption and access controls
- Device biometric-auth state is stored here as a UI hint for the patient app; it does not constitute authentication itself — biometric verification is always performed locally on-device via the OS
