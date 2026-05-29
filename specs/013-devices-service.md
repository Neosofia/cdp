# Devices Service

## Why we need this service

Mobile and browser clients need push notifications so patients receive care messages when the app is backgrounded and clinicians receive escalation alerts in the browser. Push providers issue opaque, highly sensitive tokens tied to a specific device and person. If every service that needs to notify someone stored and handled those tokens directly, the attack surface would multiply: a bug in chat, notification, or SMS code could leak credentials that identify a patient’s device and enable unsolicited contact.

The Devices Service exists so the platform has **one place** that registers devices, encrypts raw push credentials at rest, and talks to push providers on behalf of internal callers. Every other service works with an opaque device identifier; raw tokens never cross service boundaries, appear in logs, or sit in foreign databases.

## How this service fits into the platform

After a patient or clinician grants notification permission, their client registers with this service and receives a device UUID. When the Notification Service or another internal caller needs to deliver a push, it passes that UUID and a payload here; this service decrypts the stored credential internally, selects the correct provider (APNS, FCM, or Web Push), and returns the delivery outcome. Authentication establishes who is registering; authorization restricts dispatch to trusted machine callers such as the notification pipeline.

Device lifecycle stays coupled to account lifecycle. When a patient account is deactivated or deleted, registrations for that person are removed promptly so pushes cannot reach a former patient. Explicit deactivation supports logout-without-deletion. Provider feedback that marks a token invalid triggers automatic stale marking so callers stop wasting delivery attempts on dead endpoints.

## Client objectives

**Patients** want timely in-app notifications after installing or reinstalling the patient app. Registration should be idempotent -- reinstalling must not strand them with a duplicate device record or a broken push channel.

**Clinicians** want browser push for real-time escalation alerts. Granting and revoking notification permission in the browser should register and deregister cleanly without leaving ghost subscriptions.

**Internal platform services** (notification dispatch, SMS bridges, and similar) need a single, authorized path to send a push given a device UUID. They should never hold provider credentials or raw tokens; they only need a delivery outcome to drive retries and user-facing error handling.

**Security and compliance reviewers** need structural assurance that push tokens -- PII-adjacent and, for patients, PHI-adjacent -- are field-encrypted, key-managed centrally, and confined to this service’s execution boundary.

**Operators** need to measure registration volume, dispatch success and failure, and cleanup after account events without ever logging raw token material.

## Functional requirements

- **FR-001**: The service accepts device registration from authenticated patients and clinicians, stores the raw push token or browser push subscription encrypted at rest, and returns an opaque device UUID. Callers outside this service never see the raw credential.

- **FR-002**: Registration is an idempotent upsert keyed on user identity plus token or subscription endpoint. Re-submitting the same credential for the same user returns the existing device UUID without creating a duplicate row.

- **FR-003**: Token rotation is supported: given a device UUID and a new raw credential, the stored value is updated and the device UUID remains stable so downstream references do not break.

- **FR-004**: A push dispatch path accepts a device UUID and notification payload from callers presenting a notification-service machine identity. The service decrypts internally, invokes the correct provider, and returns the delivery outcome. All other callers are denied; raw tokens do not appear in requests, responses, or logs outside this service.

- **FR-005**: Raw push tokens and browser subscriptions are encrypted at the field level with keys managed by the platform key management service. Application-layer services other than this one cannot decrypt stored credentials.

- **FR-006**: The device UUID is the only device identifier surfaced platform-wide. Structural containment holds because this service is the sole caller of push provider APIs and never returns raw tokens to any caller.

- **FR-007**: When a patient account deactivation or deletion event is received, all device registrations for that patient are hard-deleted promptly so push cannot reach a terminated account.

- **FR-008**: A registration can be explicitly deactivated (soft-delete) without account deletion -- for example when a patient logs out of the app but keeps their account.

- **FR-009**: When a push provider reports a token as invalid, the registration is marked stale or inactive automatically and the failure outcome is returned to the caller so retries stop against a dead endpoint.

- **FR-010**: A raw token or subscription endpoint is associated with at most one user identity at a time. A second user attempting to register the same credential is rejected.

- **FR-011**: Unauthenticated or unauthorized requests are rejected before any registration or dispatch side effect occurs.

- **FR-012**: Every registration create, update, deactivation, hard-delete, and dispatch appends an audit record. Audit entries reference device UUID and operation type only -- never raw token values.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)). Log payloads must not include raw tokens, push endpoints, or device-to-person linkage.

- **OR-001**: Logs support **measuring** registration and dispatch behaviour. At minimum:

  - Classifying request outcomes and errors by endpoint
  - Attributing request duration by endpoint
  - Counting device registrations created and updated
  - Counting push dispatch attempts by outcome (success, stale device, provider failure)

- **OR-002**: Push provider credentials (APNS, FCM, Web Push) are held exclusively by this service. No other platform service stores or requires provider secrets.

- **OR-003**: Patient account lifecycle events are consumed from the patient service via the platform event bus. Deletion processing is observable so operators can confirm registrations were removed within the expected window after deactivation.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Authentication service spec: [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- Authorization patterns: [016-authorization-service.md](https://github.com/Neosofia/cdp/blob/main/specs/016-authorization-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- Audit infrastructure: [017-audit-infrastructure.md](https://github.com/Neosofia/cdp/blob/main/specs/017-audit-infrastructure.md)
