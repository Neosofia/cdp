# Clinical Data Platform (CDP)

## Overview

The Clinical Data Platform (CDP) is a HIPAA-compliant system that supports coordinated clinical care through AI-assisted messaging, risk detection, and clinician escalation workflows. CDP enables care teams to maintain a communication channel with patients across care settings. Patients interact via a mobile app or SMS; an AI risk agent monitors conversations for clinical risk signals and escalates high-risk interactions to on-call clinicians via a structured alert and PagerDuty escalation pipeline.

This architecture was developed using a structured specification and planning workflow. Each platform service has a corresponding feature spec (see `specs/` in the repository root). The C4 diagrams in this workspace are derived directly from those specs and maintained in sync as the platform evolves.

**Key Capabilities:**

- **Patient Communication** — Secure chat via React web app and SMS
- **AI Risk Detection** — Per-message risk evaluation using AWS Bedrock inference
- **Clinician Escalation** — 60-second self-assign window before PagerDuty escalation
- **De-identification Pipeline** — PHI/PII stripping for safe ML training datasets
- **EMR Integration** — Vendor-agnostic FHIR R4 facade for patient record access
- **Operational Observability** — SLI/SLO dashboards, alerting, and AI quality metrics

## Requirements

See the `checklists/requirements.md` document within each individual service specification folder for functional and non-functional requirements.


## Project Constitution

The platform is governed by a [constitution](../../../architecture/constitution.md) that defines non-negotiable principles for all design and implementation decisions.

## Feature Specifications

Each platform service has a full feature spec under `specs/` in the repository root:

| # | Feature | Spec |
|---|---------|------|
| 001 | Chat Service | [spec.md](../../../specs/001-chat-service/spec.md) |
| 002 | Deidentification Pipeline | [spec.md](../../../specs/002-deidentification-pipeline/spec.md) |
| 003 | Clean Chat Service | [spec.md](../../../specs/003-clean-chat-service/spec.md) |
| 004 | EMR Service | [spec.md](../../../specs/004-emr-service/spec.md) |
| 005 | Notification Service | [spec.md](../../../specs/005-notification-service/spec.md) |
| 006 | Bedrock AI Workbench | [spec.md](../../../specs/006-bedrock-ai-workbench/spec.md) |
| 007 | Patient Chat App | [spec.md](../../../specs/007-patient-chat-app/spec.md) |
| 008 | Clinician App | [spec.md](../../../specs/008-clinician-app/spec.md) |
| 009 | SMS Service | [spec.md](../../../specs/009-sms-service/spec.md) |
| 010 | AI Agent Service | [spec.md](../../../specs/010-ai-agent-service/spec.md) |
| 011 | Operational Metrics | [spec.md](../../../specs/011-operational-metrics/spec.md) |
| 012 | Patient Service | [spec.md](../../../specs/012-patient-service/spec.md) |
| 013 | Devices Service | [spec.md](../../../specs/013-devices-service/spec.md) |
| 014 | Authentication Service | [spec.md](../../../specs/014-authentication-service/spec.md) |
| 015 | Care Episode Service | [spec.md](../../../specs/015-care-episode-service/spec.md) |
| 016 | Authorization Service | [spec.md](../../../specs/016-authorization-service/spec.md) |
| 017 | Audit Infrastructure | [spec.md](../../../specs/017-audit-infrastructure/spec.md) |

