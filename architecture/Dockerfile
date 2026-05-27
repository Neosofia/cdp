# Shared Structurizr WAR (same version for dev and production)
FROM structurizr/structurizr@sha256:f2f00afe45c1981d557c5e1bd52fbcc8da0632d10a7c38038b6a1952db3e643b AS structurizr-war

FROM eclipse-temurin:21-jre-jammy AS base

COPY --from=structurizr-war /usr/local/structurizr.war /usr/local/structurizr.war

# Bake viewer docs from canonical repo sources (README, specs, constitution).
FROM base AS content-builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

COPY architecture/scripts/prepare_structurizr_content.py /prepare_structurizr_content.py
COPY README.md /build/README.md
COPY specs/ /build/specs/
COPY architecture/constitution.md /build/architecture/constitution.md
RUN python3 /prepare_structurizr_content.py /build /out/content

# Dev: editable Structurizr local mode (docker compose up)
FROM base AS dev

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

COPY architecture/scripts/prepare_structurizr_content.py /usr/local/bin/prepare_structurizr_content.py
COPY architecture/docker/dev-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]

# Production: read-only Structurizr local mode behind nginx (Railway deploy)
FROM base AS production

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

COPY architecture/structurizr/ /usr/local/structurizr/
COPY architecture/adrs/ /usr/local/structurizr/adrs/
COPY --from=content-builder /out/content /usr/local/structurizr/content

RUN echo 'map $http_x_forwarded_proto $fwd_scheme { default $scheme; https https; }' \
    > /etc/nginx/conf.d/fwd-scheme.conf

RUN cat > /etc/nginx/sites-available/default <<'NGINX'
server {
    listen 8080;
    location / {
        proxy_pass         http://127.0.0.1:8081;
        proxy_set_header   Host              localhost:8081;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto "";

        proxy_redirect     http://localhost:8081/ $fwd_scheme://$http_host/;
        proxy_redirect     http://127.0.0.1:8081/ $fwd_scheme://$http_host/;

        proxy_set_header   Accept-Encoding   "";
        sub_filter         'http://localhost:8081' '';
        sub_filter         'http://127.0.0.1:8081' '';
        sub_filter         'http://localhost' '';
        sub_filter         'const svg = self.exportCurrentDiagramToSVG(options);' 'options.dimensions = true; const svg = self.exportCurrentDiagramToSVG(options);';
        sub_filter_once    off;
        sub_filter_types   text/javascript application/javascript application/json text/html;

        proxy_hide_header  Content-Security-Policy;
        add_header         Content-Security-Policy "script-src 'self' 'unsafe-inline'; worker-src blob:" always;
    }
}
NGINX

RUN cat > /start.sh <<'SH' && chmod +x /start.sh
#!/bin/sh
nginx -g 'daemon off;' &
exec java \
    -Dserver.address=127.0.0.1 \
    -Dserver.port=8081 \
    -Dstructurizr.editable=false \
    -Dstructurizr.workspace.maxsize=10MB \
    --enable-native-access=ALL-UNNAMED \
    -jar /usr/local/structurizr.war \
    local
SH

EXPOSE 8080
ENTRYPOINT ["/start.sh"]
