# Patient Service

## Why we need this service

Every care workflow on the platform starts with a person -- but "person using the chat app" is not the same data object as "patient under post-discharge monitoring for procedure X." Demographic and contact information (name, date of birth, email, phone, address, emergency contact) is PHI that many services need read-only access to, yet no service except this one should become a second copy of the patient master record. The Patient Service exists as the **authoritative registry of patient identity and contact PII/PHI** on the platform: one place to create a patient through a controlled invitation path, retrieve records for clinical and patient-facing apps, and audit who accessed what.

Records are **immutable after creation** in this iteration -- corrections and archival are future concerns. Registration requires a valid invite token so every patient row is linked to a care context from the first moment it exists, solving the patient-to-episode association problem at enrolment rather than after the fact.

## How this service fits into the platform

Patients enter through a clinician- or system-issued invitation encoded by the Care Episode Service. The patient presents the invite token during self-registration; this service validates the token, collects required identity fields, checks for likely duplicates, creates the record atomically with its audit entry, and associates the row with the care episode referenced in the invite. Authentication identity is established by the Authentication Service; this service trusts gateway-attested tokens and enforces read policy by role.

The Patient Service stores demographic and contact information only -- not diagnoses, medications, or clinical notes. The SMS Service matches inbound phone numbers here; the Chat Service and Notification Service read identifiers and contact routes as needed; the de-identification pipeline does not replace this registry. Invite generation and delivery (SMS, email) are owned elsewhere; this service validates tokens at registration time only.

## Client objectives

**New patients** want a straightforward registration flow after receiving an invitation -- provide their details once, know they are linked to the right care context, and not accidentally create a duplicate account when one already exists.

**Patients using the chat app** want to view their own demographic and contact information on file so they can verify accuracy and feel informed about what the organisation holds about them.

**Clinicians** need to search and open patient records by name or identifier within their organisation so clinical workflows can proceed without a separate provisioning desk.

**Compliance and audit staff** need tamper-evident access records showing who read or created patient data, queryable only by authorised compliance roles -- not exposed to general clinical or patient users.

**Downstream services** need stable patient identifiers and normalised contact fields (especially email for SMS OTP and optional E.164 phone for SMS matching) without each service maintaining its own patient table.

## Functional requirements

- **FR-001**: Patient self-registration requires a valid, unexpired, previously unused invite token. Requests without a valid token are rejected. The created record is associated with the care context encoded in the token.

- **FR-002**: Required registration fields are validated before persistence; missing or invalid fields return clear feedback identifying what must be corrected. Minimum required fields include full name, date of birth, and email address (required as the OTP delivery route for SMS chat authentication); contact phone number is optional at registration but required for SMS channel use.

- **FR-003**: When submitted registration data closely matches an existing record, registration is blocked and the response instructs the patient to sign in to their existing account rather than creating a duplicate.

- **FR-004**: Authorised callers retrieve a complete patient record by unique patient identifier. Authenticated clinicians search by name and other identifying attributes within their organisation; empty search results return an empty set, not an error.

- **FR-005**: A patient user may read only their own record and cannot access or enumerate any other patient's record. Clinician read access within the organisation is permitted; finer-grained per-record enforcement for clinicians is owned by the consuming application layer in this iteration.

- **FR-006**: Patient records are read-only after creation in this iteration. Modification, archival, and deactivation are out of scope here.

- **FR-007**: Record creation and the corresponding audit log entry are persisted atomically -- partial writes that leave a record without audit or audit without record do not occur.

- **FR-008**: Audit log entries capture acting user identity, operation (create or read), affected patient identifier, and timestamp. Audit data is queryable only by users with a compliance or admin role.

- **FR-009**: All access requires a valid authenticated platform token except an unauthenticated health check. Unauthenticated or unauthorised requests are rejected without data disclosure.

- **FR-010**: Record deletion is out of scope; retention follows healthcare data retention policy configured for the deployment.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)). Log payloads must not include names, dates of birth, email, phone, or address.

- **OR-001**: Logs support **measuring** registration outcomes, duplicate blocks, read access patterns, and authorisation denials. At minimum:

  - Classifying registration requests by outcome (created, validation failed, duplicate blocked, invalid invite)
  - Counting record reads by caller role category
  - Counting authorisation denials without exposing requested identifiers in the log payload

- **OR-002**: Audit log retention satisfies deployment healthcare compliance requirements; minimum retention period is configured in operational policy rather than duplicated in this spec.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Care episode service spec: [015-care-episode-service.md](https://github.com/Neosofia/cdp/blob/main/specs/015-care-episode-service.md)
- Authentication service spec: [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- SMS service spec: [009-sms-service.md](https://github.com/Neosofia/cdp/blob/main/specs/009-sms-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
