# 10. ADR 0010: Role Picker UI and Single Active Role Enforcement

## Context
When interacting with the system, users may possess multiple valid WorkOS organization roles (e.g., both `clinician` and `admin`). In a standard B2B setup, it can be convenient to load all roles into a single JWT and let policies sort out access. However, loading multiple cross-functional credentials simultaneously violates the principle of least privilege, opening the door for unintended destructive actions while a user is performing standard operational tasks. We need a way to maintain strict separation of duties while preserving flexibility for development and demonstration scenarios.

## Decision
We will enforce a **Single Active Role** architecture in the user interface:
1. When a user authenticates, the system will identify all their authorized roles.
2. If a user possesses more than one authorized role, the UI will display a **Role Picker**. 
3. Only the selected active role will be utilized for interactions contextually. 
4. If a user possesses a single role (99% of users), the Role Picker is functionally suppressed to minimize UI clutter.

## Rationale
- **Principle of Least Privilege**: Users are forced to explicitly "assume" elevated or alternate roles, drastically reducing accidental configuration drift or data loss.
- **Cleaner UI/UX**: The application interface only renders features explicitly relevant to the active role (e.g., the Clinical Dashboard vs the Admin Settings console), avoiding complex layout merges.
- **Auditability**: Tracing explicitly logs not just who performed an action, but under what capacity they were actively acting when the action was invoked.
- **Demonstration Capability**: Development and demo scenarios vastly benefit from rapid, explicit context switching to show boundary controls in real time.

## Status
Accepted
