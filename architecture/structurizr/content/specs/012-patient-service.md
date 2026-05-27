## Feature Specification: Patient Service

**Feature Branch**: `012-patient-service`  
**Created**: April 18, 2026  
**Status**: Draft  
**Input**: User description: "I need to create a new spec for the patient service. This service contains all the PII about a patient and is used by both the patient chat app and clinician app. It's a standard web service that allows for the creation and modification of patient records."

### User Scenarios & Testing

#### User Story 1 - Patient Registers via Clinician Invitation (Priority: P1)

A new patient receives an invitation issued by a clinician or the system, then follows the invite link to register on the platform. During registration the patient provides their identifying and contact information. The resulting patient record is automatically associated with the care context that prompted the invitation.

**Why this priority**: A patient record must exist before any other platform functionality (chat, notifications, care coordination) can be used. The invitation model ensures every patient record is linked to a care context from the moment of creation, solving the patient-to-provider association problem at registration time.

**Independent Test**: Can be fully tested by presenting a valid invite token with required patient details and verifying the record is created, assigned a unique identifier, linked to the correct care context, and immediately retrievable.

**Acceptance Scenarios**:

1. **Given** a patient with a valid invite token, **When** they submit their required details during registration, **Then** a unique patient record is created, linked to the care context from the invite, and a confirmation with the new record identifier is returned
2. **Given** a patient submits registration details with a valid invite token, **When** required fields are missing, **Then** the system rejects the request with a clear error identifying the specific missing fields
3. **Given** a patient presents an invite token during registration, **When** the token has expired or has already been used, **Then** registration is rejected and the patient is informed the invitation is no longer valid
4. **Given** a patient submits registration details with a valid invite token, **When** the submitted data closely matches an existing patient record (potential duplicate), **Then** registration is blocked and the patient is instructed to log in to their existing account instead

---

#### User Story 2 - Clinician Retrieves and Searches Patient Records (Priority: P2)

A clinician needs to look up existing patients by name, identifier, or other attributes in order to access a specific patient's record within the clinical workflow.

**Why this priority**: Clinicians work with many patients; the ability to find and retrieve a specific patient record is fundamental to all clinical workflows that follow.

**Independent Test**: Can be fully tested by searching for a patient by name and by unique identifier and verifying correct records are returned without access to other workflows.

**Acceptance Scenarios**:

1. **Given** an authenticated clinician, **When** they search by a patient's name or partial name, **Then** matching patient records are returned
2. **Given** an authenticated clinician, **When** they request a specific patient by unique identifier, **Then** the full patient record is returned
3. **Given** an authenticated clinician searches with a term that matches no patients, **When** the search is processed, **Then** an empty result set (not an error) is returned
4. **Given** an authenticated clinician, **When** they attempt to access a patient record they are not authorized to view, **Then** the request is denied

---

#### User Story 3 - Patient Views Their Own Record (Priority: P3)

A patient using the patient chat app needs to view their own demographic and contact information currently on file, enabling them to verify accuracy and feel informed about their own data.

**Why this priority**: Patients have a right to view their own records, and the patient chat app depends on this capability for personalization and patient-facing verification workflows.

**Independent Test**: Can be fully tested by retrieving a record using an authenticated patient identity and verifying only that patient's record is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated patient, **When** they request their own record, **Then** they receive their patient record data
2. **Given** an authenticated patient, **When** they attempt to access the record of a different patient, **Then** the request is denied and no data is disclosed

---

#### Edge Cases

- How does the system handle a request to archive or deactivate a patient record (as opposed to deletion)?
- What happens when a consuming application presents an expired or invalid identity credential?
- What happens when a patient attempts to register using an expired invite token? Registration is rejected and the patient is informed the invitation is no longer valid.
- What happens when an invite token has already been used (patient attempts to register a second time with the same invite)? The token is rejected as already consumed.
- What happens if a patient with an invite attempts to register but already has an existing patient record? Registration is blocked and the patient is redirected to log in to their existing account.

### Requirements

#### Functional Requirements

- **FR-001**: The service MUST require a valid, unexpired, and previously unused invite token as part of patient registration; registration requests without a valid invite token MUST be rejected
- **FR-001a**: The service MUST allow a patient presenting a valid invite token to create their own patient record containing required identifying and contact information; the created record MUST be associated with the care context encoded in the invite token
- **FR-002**: The service MUST reject creation of a patient record that is missing required fields, returning clear validation feedback identifying the specific missing fields
- **FR-003**: The service MUST detect when a new patient record being submitted closely matches an existing record; when a potential duplicate is found, registration MUST be blocked and the response MUST instruct the patient to log in to their existing account
- **FR-004**: The service MUST allow authorized users to retrieve a complete patient record by unique patient identifier
- **FR-005**: The service MUST allow authenticated clinicians to search for patients by name and other identifying attributes, returning a list of matching records
- **FR-006**: Record modification is out of scope; patient records are read-only after creation
- **FR-007**: The service MUST enforce that a patient user can only read their own record and cannot access or enumerate any other patient's record
- **FR-008**: The service MUST allow any authenticated clinician to read any patient record within the organization; access is controlled at the application layer by the clinician app rather than enforced per-record by this service
- **FR-009**: Patient record creation and the corresponding audit log entry MUST be persisted atomically — either both are committed or neither is; partial writes that result in a record without an audit entry (or vice versa) MUST NOT occur
- **FR-010**: Audit log entries MUST be accessible only to users with a compliance/admin role; no other user type may query or read audit log data
- **FR-011**: Audit log entries MUST be retained for a minimum period to satisfy HIPAA requirements [NEEDS CLARIFICATION: retention period not yet defined — HIPAA minimum is 6 years]
- **FR-012**: The service MUST reject all requests from unauthenticated or unauthorized callers

#### Key Entities

- **Patient Record**: The core data entity representing a patient. Includes full name, date of birth, biological sex, email address (required), contact phone number (optional), mailing address, emergency contact details, a reference to the associated care episode (FK → Care Episode Service `015-care-episode-service`), and a system-generated unique identifier. Optionally includes an organization-assigned medical record number (MRN).
- **Invite**: A time-limited token authorizing a specific person to register as a patient on the platform. Includes a unique token, the care episode ID (FK → Care Episode Service `015-care-episode-service`), an expiry timestamp, the contact information used to deliver the invitation (phone number or email address), and a status (pending, used, or expired). Invite generation and delivery are handled by other platform services and are out of scope for this service.
- **Audit Log Entry**: A tamper-evident record of a data access or modification event, capturing: the acting user's identity, the operation performed (create/read), the affected patient record identifier, and the timestamp of the event.

### Success Criteria

#### Measurable Outcomes

- **SC-001**: Patient record creation and its corresponding audit log entry are always consistent — there are no patient records without an audit entry and no audit entries for records that do not exist
- **SC-002**: Zero unauthorized access attempts succeed — all requests from unauthenticated or unauthorized users are rejected
- **SC-003**: Duplicate detection identifies potential duplicates in the large majority of cases where two records have the same name and date of birth, preventing accidental duplicate creation
- **SC-004**: Latency and throughput targets are governed by `011-operational-metrics` and are not duplicated here

### Assumptions

- This service handles Protected Health Information (PHI) subject to HIPAA; all privacy and security controls are designed to meet HIPAA requirements
- Authentication and identity management are provided by the Authentication Service (`014-authentication-service`); this service trusts the authenticated identity and role claims asserted by the API gateway
- Patient records are created by patients following a clinician-issued or system-issued invitation; registration without a valid invite token is not permitted
- Invite generation and delivery (e.g., via SMS or email) are handled by other platform services (notification service, SMS service) and are out of scope for this service; this service only validates invite tokens presented during registration
- Record modification is out of scope for this iteration; patient records are immutable after creation. Record archival or deactivation may be addressed in a future iteration
- Record deletion is out of scope; patient records are retained in accordance with healthcare data retention regulations
- The patient chat app and clinician app are the primary consuming applications; other platform services (e.g., notification service, de-identification pipeline) may read patient records in a limited, read-only capacity
- The minimum required fields for a valid patient record are: full name, date of birth, email address (required as the OTP delivery route for SMS chat threads), and optionally a contact phone number
- This service stores only demographic and contact information (PII/PHI); clinical data such as diagnoses, medications, and clinical notes are outside the scope of this service
- Web service SLOs and SLIs (latency, availability, throughput) are defined in `011-operational-metrics` and are not duplicated in this spec
- The patient data model is platform-specific and does not need to conform to HL7/FHIR standards; no external EHR/EMR interoperability is required
- This service is an internal platform service consumed by other platform components, not directly by end users
