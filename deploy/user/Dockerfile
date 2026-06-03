# CDP User service runtime — platform user image + product Cedar overrides.
# Same pattern as capabilities + cdp-ui-policies (ADR-0012).
#
# Build from CDP repo root:
#   docker build -f deploy/user/Dockerfile --build-arg USER_IMAGE=ghcr.io/neosofia/user:v0.6.1 -t cdp-user:local .
#
# Release: tag cdp-user/vMAJOR.MINOR.PATCH → .github/workflows/cdp-user-build-push.yml

ARG USER_IMAGE=ghcr.io/neosofia/user:v0.6.1

FROM ${USER_IMAGE} AS user_base

FROM alpine:3.20 AS policy_pack
COPY policies/service-overrides/user /overrides
COPY --from=user_base /app/policies /base
RUN mkdir -p /pack \
    && cp /base/*.cedar /pack/ \
    && cp /overrides/*.cedar /pack/

FROM ${USER_IMAGE}
USER root
COPY --from=policy_pack /pack /app/policies
USER app
