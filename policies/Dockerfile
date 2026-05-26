# UI policy bundle image consumed by the capabilities service at build time.
# Same pattern as ghcr.io/neosofia/sql-template for authentication audit SQL.
#
# Build from the CDP repo:
#   docker build -f policies/Dockerfile -t cdp-ui-policies:local policies
#
# Release tag convention: cdp-ui-policies/vMAJOR.MINOR.PATCH

FROM scratch

COPY . /policies/

LABEL org.opencontainers.image.title="cdp-ui-policies"
LABEL org.opencontainers.image.description="CDP UI Cedar policy bundle for the capabilities service"
LABEL org.opencontainers.image.source="https://github.com/Neosofia/cdp"
