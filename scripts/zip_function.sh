#!/usr/bin/env bash
# Zip the Appwrite function folder ready for upload/deploy
set -euo pipefail

FUNC_DIR="$(cd "$(dirname "$0")/../appwrite-functions/process-template" && pwd)"
OUT="${FUNC_DIR}/function.zip"

echo "Zipping function from ${FUNC_DIR} to ${OUT}"
cd "${FUNC_DIR}"
rm -f function.zip
zip -r function.zip . -x "node_modules/*" 
echo "Created ${OUT}"
