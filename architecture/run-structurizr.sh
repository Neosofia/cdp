#!/bin/sh
set -e

: "${STRUCTURIZR_EDITABLE:=false}"

mkdir -p /usr/local/structurizr
cat > /usr/local/structurizr/structurizr.properties <<EOF
structurizr.editable=${STRUCTURIZR_EDITABLE}
EOF

exec java -Dserver.port="${PORT:-8080}" --enable-native-access=ALL-UNNAMED -jar /usr/local/structurizr.war "$@"
