# CDP User service bundle — role-catalog overlay for the user service image.
# Cedar policies live in the user repo (user/policies/*.cedar); this image ships
# only the CDP role-catalog overlay consumed at ROLE_CATALOG_OVERLAY.
#
# Build from the CDP repo root:
#   docker build -f policies/service-overrides/user/Dockerfile \
#     -t cdp-user-policies:local .
#
# Release tag convention: cdp-user-policies/vMAJOR.MINOR.PATCH

FROM scratch

COPY roles/user-catalog.overlay.json /policies/cdp-overlay.json

LABEL org.opencontainers.image.title="cdp-user-policies"
LABEL org.opencontainers.image.description="CDP Cedar policy overrides for the user service"
LABEL org.opencontainers.image.source="https://github.com/Neosofia/cdp"
