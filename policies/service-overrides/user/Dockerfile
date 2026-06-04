# CDP User service Cedar overrides — policy-only image for the user service Dockerfile.
# Same pattern as policies/Dockerfile (cdp-ui-policies) and sql-template → authentication.
#
# Build from the CDP repo root:
#   docker build -f policies/service-overrides/user/Dockerfile \
#     -t cdp-user-policies:local .
#
# Release tag convention: cdp-user-policies/vMAJOR.MINOR.PATCH

FROM scratch

COPY policies/service-overrides/user/ /policies/
# Clinical role catalog for User service login-time default_roles_by_actor (ADR-0014).
COPY roles/user-catalog.overlay.json /policies/cdp-overlay.json

LABEL org.opencontainers.image.title="cdp-user-policies"
LABEL org.opencontainers.image.description="CDP Cedar policy overrides for the user service"
LABEL org.opencontainers.image.source="https://github.com/Neosofia/cdp"
