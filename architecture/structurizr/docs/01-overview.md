# Clinical Data Platform (CDP)

## Overview

The Clinical Data Platform (CDP) is a HIPAA-compliant system that supports coordinated clinical care through AI-assisted messaging, risk detection, and clinician escalation workflows. CDP enables care teams to maintain a communication channel with patients across care settings. Patients interact via a mobile app or SMS; an AI risk agent monitors conversations for clinical risk signals and escalates high-risk interactions to on-call clinicians via a structured alert and PagerDuty escalation pipeline.

This architecture was developed using **Spec Kit**, a structured specification and planning workflow for AI-assisted software development. Each platform service has a corresponding feature spec (see `specs/` in the repository root) generated and refined through the Spec Kit `specify → plan → tasks → implement` pipeline. The C4 diagrams in this workspace are derived directly from those specs and maintained in sync as the platform evolves.

**Key Capabilities:**

- **Patient Communication** — Secure chat via Flutter mobile/web app and SMS
- **AI Risk Detection** — Per-message risk evaluation using AWS Bedrock inference
- **Clinician Escalation** — 60-second self-assign window before PagerDuty escalation
- **De-identification Pipeline** — PHI/PII stripping for safe ML training datasets
- **EMR Integration** — Vendor-agnostic FHIR R4 facade for patient record access
- **Operational Observability** — SLI/SLO dashboards, alerting, and AI quality metrics

## Requirements

See [requirements.md](https://github.com/byoung/cdp/blob/main/requirements.md) for the full functional and non-functional requirements.


## Project Constitution

The platform is governed by a [constitution](https://github.com/byoung/cdp/blob/main/.specify/memory/constitution.md) that defines non-negotiable principles for all design and implementation decisions.

## Feature Specifications

Each platform service has a full feature spec under `specs/` in the repository root:

| # | Feature | Spec |
|---|---------|------|
| 001 | Chat Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/001-chat-service/spec.md) |
| 002 | Deidentification Pipeline | [spec.md](https://github.com/byoung/cdp/blob/main/specs/002-deidentification-pipeline/spec.md) |
| 003 | Clean Chat Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/003-clean-chat-service/spec.md) |
| 004 | EMR Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/004-emr-service/spec.md) |
| 005 | Notification Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/005-notification-service/spec.md) |
| 006 | Bedrock AI Workbench | [spec.md](https://github.com/byoung/cdp/blob/main/specs/006-bedrock-ai-workbench/spec.md) |
| 007 | Patient Chat App | [spec.md](https://github.com/byoung/cdp/blob/main/specs/007-patient-chat-app/spec.md) |
| 008 | Clinician App | [spec.md](https://github.com/byoung/cdp/blob/main/specs/008-clinician-app/spec.md) |
| 009 | SMS Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/009-sms-service/spec.md) |
| 010 | AI Agent Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/010-ai-agent-service/spec.md) |
| 011 | Operational Metrics | [spec.md](https://github.com/byoung/cdp/blob/main/specs/011-operational-metrics/spec.md) |
| 012 | Patient Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/012-patient-service/spec.md) |
| 013 | Devices Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/013-devices-service/spec.md) |
| 014 | Authentication Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/014-authentication-service/spec.md) |
| 015 | Care Episode Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/015-care-episode-service/spec.md) |
| 016 | Authorization Service | [spec.md](https://github.com/byoung/cdp/blob/main/specs/016-authorization-service/spec.md) |

