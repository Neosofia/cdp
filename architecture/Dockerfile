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
# "localhost:8081" so that structurizr activates local mode (read-only, single
# workspace) and includes the port in redirect URLs.
# proxy_redirect rewrites the absolute Location header structurizr emits on
# redirect. $fwd_scheme captures Railway's X-Forwarded-Proto so the rewritten
# Location uses the correct public scheme (https) rather than the internal http.
# sub_filter strips "http://localhost:8081" from response bodies so the browser
# resolves all API/asset paths relative to the public URL.
# Capture Railway's X-Forwarded-Proto before we clear it for the upstream.
# proxy_redirect uses $fwd_scheme so the rewritten Location uses the correct
# public scheme (https) rather than the internal http scheme nginx sees.
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
        # Fix upstream Structurizr bug (issue #40): convertDiagramToPNG passes the
        # caller's options object to exportCurrentDiagramToSVG, which only adds
        # explicit SVG width/height attributes when options.dimensions is truthy.
        # Without them Firefox renders the SVG at the CSS default intrinsic size
        # (300x150), so thumbnails and export-dialog PNG previews appear tiny.
        # Injecting options.dimensions=true inside convertDiagramToPNG itself fixes
        # all callers: exportCurrentThumbnailToPNG and the export dialog alike.
        sub_filter         'const svg = self.exportCurrentDiagramToSVG(options);' 'options.dimensions = true; const svg = self.exportCurrentDiagramToSVG(options);';
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
