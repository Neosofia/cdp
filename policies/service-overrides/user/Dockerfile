# CDP User service Cedar overrides — policy-only image for the user service Dockerfile.
# Same pattern as policies/Dockerfile (cdp-ui-policies) and sql-template → authentication.
#
# Build from the CDP repo:
#   docker build -f policies/service-overrides/user/Dockerfile \
#     -t cdp-user-policies:local policies/service-overrides/user
#
# Release tag convention: cdp-user-policies/vMAJOR.MINOR.PATCH

FROM scratch

COPY . /policies/

LABEL org.opencontainers.image.title="cdp-user-policies"
LABEL org.opencontainers.image.description="CDP Cedar policy overrides for the user service"
LABEL org.opencontainers.image.source="https://github.com/Neosofia/cdp"
