#!/bin/sh
set -e

: "${STRUCTURIZR_EDITABLE:=false}"
PORT="${PORT:-8080}"
DATA_DIR="/usr/local/structurizr"

mkdir -p "$DATA_DIR"
cat > "$DATA_DIR/structurizr.properties" <<EOF
structurizr.editable=${STRUCTURIZR_EDITABLE}
structurizr.data=file
structurizr.datadirectory=${DATA_DIR}
structurizr.network.urls.allowed=.*
EOF

exec java -Dserver.port="$PORT" --enable-native-access=ALL-UNNAMED -jar /usr/local/structurizr.war local "$DATA_DIR"
