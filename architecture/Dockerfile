# Stage 1: extract the WAR from the official image
FROM structurizr/structurizr@sha256:f2f00afe45c1981d557c5e1bd52fbcc8da0632d10a7c38038b6a1952db3e643b AS structurizr

# Stage 2: proper JRE base (Debian-based, has apt + shell)
FROM eclipse-temurin:21-jre-jammy

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

COPY --from=structurizr /usr/local/structurizr.war /usr/local/structurizr.war

COPY structurizr/ /usr/local/structurizr/
COPY adrs/ /usr/local/adrs/

# nginx proxies to structurizr's internal port and rewrites the Host header to
# "localhost" so that structurizr activates local mode (read-only, single workspace).
# proxy_redirect rewrites the absolute Location header structurizr emits on redirect.
# sub_filter strips "http://localhost" from response bodies so the browser resolves
# all API/asset paths relative to the public URL instead of trying to reach localhost.
RUN cat > /etc/nginx/sites-available/default <<'NGINX'
server {
    listen 8080;
    location / {
        proxy_pass         http://127.0.0.1:8081;
        proxy_set_header   Host              localhost;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_redirect     http://localhost:8081/ /;
        proxy_redirect     http://127.0.0.1:8081/ /;

        proxy_set_header   Accept-Encoding   "";
        sub_filter         'http://localhost:8081' '';
        sub_filter         'http://127.0.0.1:8081' '';
        sub_filter         'http://localhost' '';
        # Fix upstream Structurizr bug (issue #40): thumbnail export path calls
        # convertDiagramToPNG({ metadata: true, crop: false }) without dimensions:true.
        # exportCurrentDiagramToSVG only adds explicit SVG width/height attributes
        # when options.dimensions is truthy. Without them Firefox renders the SVG image
        # at the CSS default intrinsic size (300x150), drawing a tiny diagram onto the
        # canvas, so thumbnails appear tiny in Firefox.
        sub_filter         'convertDiagramToPNG({ metadata: true, crop: false }' 'convertDiagramToPNG({ metadata: true, crop: false, dimensions: true }';
        sub_filter_once    off;
        sub_filter_types   text/javascript application/javascript application/json text/html;

        # Railway's edge makes a separate upstream request for headers and body,
        # causing the per-request CSP nonce in the header to diverge from the nonce
        # baked into the HTML body — blocking all inline scripts.
        # Replace the nonce-based CSP with a self + unsafe-inline policy so scripts run.
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
    --enable-native-access=ALL-UNNAMED \
    -jar /usr/local/structurizr.war \
    local
SH

EXPOSE 8080
ENTRYPOINT ["/start.sh"]
