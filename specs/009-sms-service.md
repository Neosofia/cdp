# Feature Specification: SMS Service

**Feature Branch**: `009-sms-service`
**Created**: 2026-04-17
**Status**: Draft
**Input**: A service that enables post-discharge patients to interact with the platform via
standard SMS text messages, without requiring a smartphone app or internet access. Inbound
SMS messages from patients are received, normalized, and forwarded to the chat service.
Outbound responses from the AI agent or clinicians are delivered as SMS to the patient's
registered phone number.

## User Scenarios & Testing

### User Story 1 — Patient Sends a Text Message and Receives a Reply (Priority: P1)

A patient texts a platform-assigned number from their registered mobile phone. The SMS
service receives the message, creates or resumes a chat session, forwards the message to
the chat service for AI processing, and delivers the AI response back to the patient as
an SMS.

**Why this priority**: SMS is the lowest-barrier channel. It reaches patients without
smartphones, without data plans, and without the ability to install apps. It is the
most inclusive channel.

**Independent Test**: Using a test phone number, send an SMS to the platform number; verify
the message appears in the chat service with the correct patient and session association,
and an AI response SMS is delivered back within the target time.

**Acceptance Scenarios**:

1. **Given** a patient texts the platform number from their registered phone, **When**
   the SMS is received, **Then** the message is stored in the chat service and an AI response
   SMS is delivered back within 30 seconds.
2. **Given** a patient texts from a phone number not registered to any patient account,
   **When** the SMS is received, **Then** an automated reply is sent instructing the sender
   how to enrol, and the unmatched message is logged (no patient record created automatically).
3. **Given** an outbound SMS fails to deliver (e.g., phone off), **When** delivery fails
   after the carrier retry window, **Then** the delivery failure is logged, the message
   status is set to `failed`, and the failure is escalated if the message was a clinician
   reply (not an AI-generated response).

---

### User Story 2 — Patient Session Context Is Maintained Across SMS Replies (Priority: P2)

A patient sends multiple SMS messages in sequence as part of an ongoing care conversation.
Each message is associated with the same care session rather than creating a new session per
SMS, so the AI agent has conversational context.

**Why this priority**: Without session continuity, the AI agent cannot reference earlier
messages from the same conversation, reducing care quality.

**Independent Test**: Send five SMS messages from the same test phone number; verify all
five are stored under the same session ID in the chat service.

**Acceptance Scenarios**:

1. **Given** a patient has an active session and sends a follow-up SMS, **When** the SMS
   is received, **Then** it is appended to the existing session rather than creating a new one.
2. **Given** a patient session has been inactive for longer than the configured session
   timeout (e.g., 24 hours), **When** the patient sends a new SMS, **Then** a new session
   is created and the AI response acknowledges the fresh start.

---

### User Story 3 — Opt-Out and TCPA Compliance (Priority: P3)

A patient replies STOP to opt out of SMS communications. The service immediately and
permanently suppresses all future outbound SMS to that number and sends the federally
required confirmation message. The confirmation message MUST inform the patient that they
can continue to access their care conversations via the web portal or mobile app.

**Why this priority**: TCPA compliance is a legal requirement for SMS communications in the
United States. Non-compliance exposes the platform to significant legal risk.

**Independent Test**: Send STOP from a test number; verify all future outbound SMS to that
number are blocked, the opt-out record is stored, and the confirmation reply is sent
including the web/app alternative channel notice.

**Acceptance Scenarios**:

1. **Given** a patient replies STOP, **When** the SMS is received, **Then** the opt-out
   is recorded immediately, a confirmation SMS is sent informing the patient they can
   continue care conversations via the web portal or mobile app, and all subsequent
   outbound messages to that number are suppressed.
2. **Given** an opted-out patient replies START, **When** the SMS is received, **Then**
   the opt-out is lifted, a resubscription confirmation is sent, and outbound messaging
   is restored.

---

### Edge Cases

- How does the service handle multi-part (concatenated) SMS messages that arrive out of order?
  **Resolved**: Buffer all segments with a 5-second reassembly timeout; forward the
  reconstructed message to the chat service only when all segments are received in order.
  If the timeout expires before all segments arrive, forward the partial message and log a warning.
- What if the patient's registered phone number changes?
- How does the service handle non-English SMS content?
- **Provider outage**: Undelivered outbound messages are persisted to a local durable queue and retried with exponential backoff until the provider recovers.
- What is the maximum message length for AI responses sent as SMS?

## Requirements

### Functional Requirements

- **FR-001**: The service MUST receive inbound SMS from patients via a managed SMS gateway provider
  (e.g., Twilio, AWS Pinpoint) and forward them to the chat service via its
  internal API.
- **FR-002**: The service MUST match inbound SMS phone numbers to registered patient accounts;
  unmatched numbers MUST receive a configured enrollment instruction reply and MUST NOT
  create patient records.
- **FR-003**: The service MUST maintain or resume an ongoing session for a patient's phone
  number, creating a new session only after the configured inactivity timeout.
- **FR-004**: The service MUST deliver outbound SMS (AI or clinician responses) to the
  patient's registered phone number.
- **FR-005**: The service MUST implement TCPA opt-out compliance: STOP reply MUST
  immediately suppress all outbound SMS and send the required confirmation reply, which
  MUST include a notice directing the patient to the web portal or mobile app to continue
  their care conversations; START reply MUST restore outbound messaging.
- **FR-006**: The service MUST split outbound messages exceeding the SMS character limit
  (160 chars GSM / 153 chars UCS-2 for concatenated) into sequenced multi-part messages.
- **FR-007**: The service MUST track delivery status for all outbound SMS (`sent` /
  `delivered` / `failed`) using provider delivery receipts.
- **FR-008**: The service MUST NOT log the full content of inbound patient SMS in any
  unencrypted log output; message content MUST be referenced by message ID in logs.
- **FR-009**: Inbound SMS webhooks from the provider MUST be authenticated (e.g., validated
  via HMAC signature or allowlisted IP range) to prevent spoofed messages.
- **FR-010**: The service MUST be configurable with multiple long codes or short codes
  per tenant; organisations may use their own dedicated platform number.
- **FR-011**: When the SMS provider is unavailable, the service MUST persist undelivered
  outbound messages to a local durable queue and retry delivery using
  exponential backoff until the provider recovers or a maximum retry TTL is exceeded.
- **FR-012**: The service MUST buffer inbound multi-part (concatenated) SMS segments and
  reassemble them in sequence order before forwarding to the chat service. A 5-second
  reassembly timeout applies; if exceeded, the partial message is forwarded and a warning
  is logged.
- **FR-013**: On the first inbound SMS of each new session, the service MUST issue an
  OTP authentication challenge. A one-time PIN MUST be sent to the patient's registered
  email address (cross-channel second factor). The patient must reply with the PIN via
  SMS within a configurable window (default: 10 minutes). No message content is forwarded
  to the chat service until the OTP is verified. Failed or expired challenges MUST be
  logged and the patient notified via SMS.

### Key Entities

- **SMSMessage**: Message ID, patient ID (if matched), phone number, tenant ID, direction
  (`inbound` / `outbound`), content, provider message ID, delivery status, timestamp.
- **PhoneNumberRegistration**: Patient ID, phone number (E.164, stored in the patient database),
  tenant ID, opt-in status, opt-out
  timestamp (if applicable). No additional field-level encryption or separate hash lookup
  is required beyond database at-rest encryption.
- **SMSSession**: Session ID, patient ID, phone number, last activity timestamp, status
  (`active` / `timed-out`), authentication status (`pending` / `verified`).
- **SMSAuthChallenge**: Challenge ID, session ID, patient ID, OTP hash, issued timestamp,
  expiry timestamp (default +10 min), status (`pending` / `verified` / `expired` / `failed`).

## Success Criteria

### Measurable Outcomes

- **SC-001**: 95% of inbound SMS are ingested into the chat service within 5 seconds of
  delivery to the platform webhook.
- **SC-002**: 95% of outbound SMS responses are delivered to patients within 30 seconds of
  being generated by the AI agent service.
- **SC-003**: Opt-out (STOP) is processed and all future outbound suppressed within 5 seconds
  of receipt, for 100% of test cases.
- **SC-004**: 100% of inbound SMS webhooks are validated before processing; unauthenticated
  webhooks are rejected, verified by automated security tests.
- **SC-005**: Multi-part message splitting delivers messages in correct sequence for 100%
  of test cases with responses over 160 characters.
- **SC-006**: Delivery status tracking reaches a terminal state (`delivered` or `failed`)
  for 99% of outbound messages within 5 minutes.
- **SC-007**: The service MUST sustain a peak ingestion and delivery throughput of
  **3 messages/second (180 msg/min)** with p99 processing latency ≤5 seconds
  (Erlang C model: 10k SMS patients/month — 10% of 100k total — 3 US TZs, 17% busy-hour factor).
- **SC-008**: 100% of new SMS sessions MUST require a verified OTP (sent to registered
  email) before any patient message is forwarded to the chat service, verified by automated
  security tests.

## Assumptions

- An SMS gateway provider (e.g., Twilio, AWS Pinpoint) is provisioned with a HIPAA BAA or equivalent
  data processing agreement; the choice between providers is deferred to the planning phase.
- Each tenant has at least one dedicated long code or short code; shared numbers are not
  used across tenants.
- The SMS channel is text-only for v1; MMS (images, voice) support is a future enhancement.
- TCPA compliance applies to US-based patients; international regulatory requirements
  (GDPR consent for SMS in the EU) are deferred to future versions.
- Phone number lookup and patient matching are based on the normalized E.164 format.
- AI response length is constrained to ≤320 characters (2 standard SMS parts) to avoid
  excessive multi-part splitting; longer AI responses are summarized before SMS delivery.
- **Scale baseline**: 100,000 patients/month across 3 US time zones, of which **10% are
  expected to use the SMS channel** (remainder use the web/mobile app). Erlang C modelling
  (10k SMS patients/month, 2 sessions/patient, 30 msg/session, 30 s inter-message interval,
  17% busy-hour factor) yields a peak of ~2.3 msg/sec. The service MUST be sized for
  **3 msg/sec (180 msg/min)** to provide 30% headroom; daily peak volume is approximately
  48,000 SMS.
