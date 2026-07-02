# 08. OpenAPI 3.0 Specification for API Documentation

Date: 2026-04-21

## Status

Accepted — implemented in Authentication Service (014)

## Context

Integration tests must validate API behavior against a **published contract**, not imperative assertion lists. The prior approach of writing 50+ assertions per test (thanks AI!) is:

1. **Brittle** — assertions couple test code to response shape; any schema change requires finding and updating all assertions
2. **Not publishable** — contracts are embedded in test code, so they cannot be versioned, documented, or consumed by client code generators
3. **Imperative, not declarative** — tests describe "check field X is string, check field Y is integer" rather than "response must conform to this schema"
4. **Duplicated across services** — multiple services repeat the same validation logic for error responses, pagination, etc.

### OpenAPI as Single Source of Truth

OpenAPI 3.0 is a standard, language-agnostic specification format that describes HTTP APIs, including endpoints, request/response schemas, authentication, and error codes. By storing the OpenAPI specification alongside each service, we enable:

- **Contract-first development** — design the API spec first, then implement endpoints that conform to it
- **Client code generation** — OpenAPI generators can consume the spec to produce type-safe client libraries (TypeScript, Python, etc.)
- **API documentation** — OpenAPI powers Swagger UI, ReDoc, and other interactive documentation tools
- **Version control** — specs are git-tracked and part of release artifacts
- **Multi-service discoverability** — other services and client apps can fetch the spec at runtime to discover endpoints, schemas, and authentication requirements
- **Standard tooling support** — recognized by Postman, API Gateway tools, contract testing frameworks, and monitoring solutions

## Decision

All HTTP services in CDP MUST publish an **OpenAPI 3.0 specification** that documents the complete API. OpenAPI serves as the single source of truth for:

1. **All endpoints** — URL path, HTTP method, request/response shapes, status codes
2. **Request/response schemas** — JSON Schema definitions for all inputs and outputs
3. **Authentication** — which endpoints require Bearer tokens, Basic auth, session cookies, etc.
4. **Error responses** — error codes and their meanings
5. **Server information** — development, staging, production URLs
6. **API metadata** — title, description, version, contact information

The OpenAPI spec is:
- **Required** — every service MUST publish an OpenAPI 3.0 document
- **Complete** — MUST document all public endpoints and security schemes
- **Discoverable** — MUST be served at `GET /openapi.json` (or `/openapi.yaml`)
- **Versioned** — major API changes MUST update the version field in the spec
- **Authoritative** — the spec is the single source of truth; implementation must conform to the published spec

## Contract testing

How integration tests use OpenAPI (happy-path integration, schema validation, no UI unit tests) is defined in [ADR-0020](0020-layered-testing-strategy-for-services-and-browser-ui.md). OpenAPI examples and shared schema patterns: [schemas/README.md](https://github.com/Neosofia/schemas/blob/main/README.md).

## References

- [ADR-0020](0020-layered-testing-strategy-for-services-and-browser-ui.md) — layered testing strategy
- OpenAPI 3.0.0 Specification — https://spec.openapis.org/oas/v3.0.0
- JSON Schema — https://json-schema.org/
- Shared Schemas — [schemas/README.md](https://github.com/Neosofia/schemas/blob/main/README.md)
- Auth Service implementation — [authentication/openapi.json](https://github.com/Neosofia/authentication/blob/main/openapi.json), [tests/contract/test_api_contract.py](https://github.com/Neosofia/authentication/blob/main/tests/contract/test_api_contract.py)
