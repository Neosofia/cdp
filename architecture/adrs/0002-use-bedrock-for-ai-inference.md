# 02. Use AWS Bedrock for AI Risk Inference


## Status

Accepted

## Context

The platform requires a managed AI inference service for per-message clinical risk evaluation. The evaluation must be auditable, version-tracked, and isolated from PHI-handling components. Any AI provider processing data derived from patient interactions must operate under a signed HIPAA Business Associate Agreement (BAA); self-managed or third-party inference APIs that cannot provide a BAA are not eligible.

## Decision

Use AWS Bedrock as the managed inference provider for the AI Risk Agent. AWS signs a HIPAA BAA covering Bedrock, satisfying the platform's requirement that all AI inference operates under a BAA. Bedrock additionally provides model versioning, audit logging, and does not require self-managed model infrastructure.

## Consequences

- Risk evaluations are tied to AWS region availability
- Model version is recorded per evaluation for audit purposes
- The Bedrock AI Workbench (isolated account) is kept strictly separate from the production runtime path
