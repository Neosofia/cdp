# SMS Service

## Why we need this service

Not every patient has a smartphone, a data plan, or the ability to install an app -- yet post-discharge care still needs to reach them where they are. Standard SMS is the lowest-barrier channel: any mobile phone can send and receive text messages without internet access. The SMS Service exists so patients can participate in platform care conversations through text alone, while the rest of the platform continues to treat chat as a single logical conversation regardless of whether the patient is on app, web, or SMS.

The service is a **channel adapter**, not a second chat store. It receives inbound texts from a managed gateway, normalises and authenticates them, matches the sender to a registered patient, and forwards content to the Chat Service. Outbound replies from the AI response path or clinicians travel back through the same adapter to the patient's registered phone number. TCPA opt-out handling, delivery tracking, and carrier-specific protocol details stay here so upstream services never need to speak Twilio or Pinpoint directly.

## How this service fits into the platform

Inbound SMS arrives at the gateway provider's webhook; this service validates the webhook, resolves the sender's phone number to a patient record (via the Patient Service), maintains SMS-specific session and authentication state, and calls the Chat Service ingestion API. The Chat Service owns message storage, care-episode association, AI streaming, and downstream queue publication -- the SMS Service does not duplicate any of that.

On the outbound path, channel adapters or the Chat Service request delivery of a reply; this service segments long text, dispatches through the tenant's configured number, and records delivery receipts. When a patient replies STOP or START, suppression state is enforced here before any outbound message is sent. New SMS sessions require a cross-channel OTP challenge (PIN to registered email) before patient content is forwarded -- bridging the trust gap between an unauthenticated SMS sender and a known platform account.

## Client objectives

**Patients without app access** want to text a care number and get helpful replies in plain language, in the same ongoing conversation as their clinical team would see elsewhere -- without installing anything or creating confusion about whether their message was received.

**Patients who change their mind about SMS** need a legally compliant way to opt out (STOP) and back in (START), with immediate effect and a clear pointer to web or app channels if they still want to continue care conversations there.

**Clinicians and care teams** need confidence that SMS replies reach the patient and that delivery failures on clinician-authored messages are visible and escalated -- not silently dropped when a phone is off or a carrier rejects the message.

**Platform operators** need per-tenant phone numbers, authenticated webhooks, durable retry when the SMS provider is unavailable, and observability that never puts message body content in logs.

**Downstream services** (Chat Service, Notification Service) need a reliable adapter that preserves session continuity, enforces opt-out before send, and surfaces delivery status without re-implementing carrier semantics.

## Functional requirements

- **FR-001**: The service receives inbound SMS from a managed gateway provider and forwards matched messages to the Chat Service via its internal ingestion API. Carrier webhook handling and normalisation stay in this adapter.

- **FR-002**: Inbound phone numbers are matched to registered patient accounts using normalised E.164 format. Unmatched numbers receive a configured enrolment-instruction reply; no patient record is created from an unmatched inbound message.

- **FR-003**: The service maintains or resumes an ongoing SMS session per patient phone number, appending follow-up texts to the existing Chat Service session. A new session is created only after the configured inactivity timeout (for example 24 hours), at which point the AI response may acknowledge a fresh start.

- **FR-004**: Outbound SMS -- AI or clinician replies -- is delivered to the patient's registered phone number on the tenant's configured long code or short code. Each tenant may have one or more dedicated numbers; shared numbers across tenants are not used.

- **FR-005**: TCPA opt-out compliance is enforced: a STOP reply immediately suppresses all future outbound SMS to that number and sends the federally required confirmation, including notice that the patient may continue care conversations via the web portal or mobile app. A START reply lifts the suppression and sends a resubscription confirmation.

- **FR-006**: Outbound messages exceeding the SMS character limit are split into sequenced multi-part messages (160 characters GSM / 153 characters UCS-2 per segment when concatenated). AI responses intended for SMS are constrained to a practical maximum (for example two standard parts); longer AI output is summarised before delivery.

- **FR-007**: Delivery status for every outbound message is tracked through provider receipts (`sent`, `delivered`, `failed`). Clinician reply failures are escalated; AI reply failures are logged without the same escalation path.

- **FR-008**: Inbound multi-part (concatenated) SMS segments are buffered and reassembled in sequence order before forwarding. A short reassembly timeout applies; if segments are incomplete when it expires, the partial message is forwarded and a warning is recorded.

- **FR-009**: On the first inbound SMS of each new session, an OTP authentication challenge is issued: a one-time PIN is sent to the patient's registered email address. The patient must reply with the PIN via SMS within a configurable window (default ten minutes). No message content is forwarded to the Chat Service until the OTP is verified; failed or expired challenges are recorded and the patient is notified via SMS.

- **FR-010**: Inbound provider webhooks are authenticated (for example HMAC signature validation or allowlisted source ranges) so spoofed messages cannot enter the platform.

- **FR-011**: Message body content does not appear in application logs; logs reference message identifiers only. Structured lifecycle events follow the platform log schema without PHI in payloads.

- **FR-012**: When the SMS provider is unavailable, undelivered outbound messages are persisted to a local durable queue and retried with exponential backoff until the provider recovers or a maximum retry TTL is exceeded.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)). Log payloads must not include phone numbers, message text, or patient-identifying fields.

- **OR-001**: Logs support **measuring** ingestion latency, outbound delivery outcomes, opt-out processing, OTP challenge results, provider errors, and queue depth. At minimum:

  - Classifying inbound webhook processing outcomes by result (matched, unmatched, opt-out, OTP pending)
  - Attributing end-to-end processing duration for inbound and outbound paths
  - Counting outbound messages by terminal delivery status
  - Counting opt-out and opt-in events
  - Counting OTP challenges issued, verified, expired, and failed

- **OR-002**: The service is sized for expected SMS channel volume with headroom above modelled peak throughput so carrier bursts and multi-part expansion do not saturate the adapter during busy care hours.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Chat service spec: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- Patient service spec: [012-patient-service.md](https://github.com/Neosofia/cdp/blob/main/specs/012-patient-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- Structured log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
