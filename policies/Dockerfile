# CDP platform policy bundle — capabilities UI Cedar + user role catalog.
#
# Build from the policies directory:
#   docker build -f Dockerfile -t cdp-policies:local .
#
# Release tag convention: cdp-policies/vMAJOR.MINOR.PATCH
#
# Layout in the image:
#   /policies/capabilities/   → capabilities service (CAPABILITIES_POLICIES_DIR)
#   /policies/user/           → user service (ROLE_CATALOG_OVERLAY)

FROM scratch

COPY capabilities /policies/capabilities
COPY user /policies/user

LABEL org.opencontainers.image.title="cdp-policies"
LABEL org.opencontainers.image.description="CDP platform policy bundle for capabilities and user services"
LABEL org.opencontainers.image.source="https://github.com/Neosofia/cdp"
