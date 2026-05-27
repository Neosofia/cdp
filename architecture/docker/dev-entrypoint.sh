#!/bin/sh
set -e

python3 /usr/local/bin/prepare_structurizr_content.py /repo /usr/local/structurizr/content

exec java \
    -Dserver.port=8080 \
    --enable-native-access=ALL-UNNAMED \
    -jar /usr/local/structurizr.war \
    local
