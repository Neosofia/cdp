#!/bin/sh
set -e

python3 /usr/local/bin/prepare_structurizr_content.py /repo /usr/local/structurizr/content

STRUCTURIZR_JAR=/usr/local/structurizr.war
WORKSPACE_DIR=/usr/local/structurizr
DSL="${WORKSPACE_DIR}/workspace.dsl"
JSON="${WORKSPACE_DIR}/workspace.json"
SYNC_DIR=/tmp/structurizr-sync

mkdir -p "${SYNC_DIR}"

# workspace.dsl owns structure; workspace.json owns diagram layouts (autosaved by Local).
# Merge on start so DSL edits apply without resetting manual layout work.
if [ -f "${JSON}" ]; then
    java --enable-native-access=ALL-UNNAMED -jar "${STRUCTURIZR_JAR}" merge \
        -w "${DSL}" \
        -l "${JSON}" \
        -o "${SYNC_DIR}/workspace.json"
else
    java --enable-native-access=ALL-UNNAMED -jar "${STRUCTURIZR_JAR}" export \
        -w "${DSL}" \
        -f json \
        -o "${SYNC_DIR}"
fi

cp "${SYNC_DIR}/workspace.json" "${JSON}"

exec java \
    -Dserver.port=8080 \
    --enable-native-access=ALL-UNNAMED \
    -jar "${STRUCTURIZR_JAR}" \
    local
