#!/usr/bin/env bash
# Safe provisioning script for Appwrite `project_forms` collection.
# Usage: set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY
# By default this prints the curl commands. To execute them set EXECUTE=true in env.

set -euo pipefail

if [ -z "${APPWRITE_ENDPOINT:-}" ] || [ -z "${APPWRITE_PROJECT_ID:-}" ] || [ -z "${APPWRITE_DATABASE_ID:-}" ] || [ -z "${APPWRITE_API_KEY:-}" ]; then
  echo "Required env vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY"
  echo "This script will print the curl commands you can run to provision the collection."
fi

COLLECTION_ID="project_forms"
COLLECTION_NAME="Project Forms"

echo "--- Provision commands for collection: $COLLECTION_ID ---"

echo "1) Create collection"
cat <<CURL
curl -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections" \
  -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionId": "$COLLECTION_ID",
    "name": "$COLLECTION_NAME",
    "read": ["role:all"],
    "write": ["role:all"]
  }'
CURL

echo
echo "2) Add string attributes (projectId, formKey, title, data, attachments, submittedByUserId, assignedToUserId, status, meta)"

declare -a ATTRS=(
  "projectId"
  "formKey"
  "title"
  "data"
  "attachments"
  "submittedByUserId"
  "assignedToUserId"
  "status"
  "meta"
)

for attr in "${ATTRS[@]}"; do
  echo "-- attribute: $attr"
  cat <<CURL
curl -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/attributes/string" \
  -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "key": "$attr", "size": 65535, "required": false }'
CURL
  echo
done

echo "3) Create indexes (projectId, submittedByUserId, assignedToUserId, status)"

cat <<CURL
curl -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/indexes" \
  -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "idx_projectId",
    "type": "key",
    "attributes": ["projectId"]
  }'
CURL

cat <<CURL
curl -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/indexes" \
  -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "idx_submittedBy",
    "type": "key",
    "attributes": ["submittedByUserId"]
  }'
CURL

cat <<CURL
curl -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/indexes" \
  -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "idx_assignedTo",
    "type": "key",
    "attributes": ["assignedToUserId"]
  }'
CURL

cat <<CURL
curl -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/indexes" \
  -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "idx_status",
    "type": "key",
    "attributes": ["status"]
  }'
CURL

echo
echo "Note: The above commands are safe to run from a shell with the env vars set."
echo "If you want the script to execute the commands directly, set EXECUTE=true in env before running."

if [ "${EXECUTE:-false}" = "true" ]; then
  echo "EXECUTE=true; running commands..."
  # Running the first create collection command
  curl -s -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections" \
    -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
    -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"collectionId":"'$COLLECTION_ID'","name":"'$COLLECTION_NAME'","read":["role:all"],"write":["role:all"]}' | jq .

  for attr in "${ATTRS[@]}"; do
    curl -s -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/attributes/string" \
      -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
      -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{ "key": "'$attr'", "size": 65535, "required": false }' | jq .
  done

  # indexes (simple sequential creation)
  curl -s -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/indexes" \
    -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
    -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"key":"idx_projectId","type":"key","attributes":["projectId"]}' | jq .

  curl -s -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/indexes" \
    -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
    -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"key":"idx_submittedBy","type":"key","attributes":["submittedByUserId"]}' | jq .

  curl -s -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/indexes" \
    -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
    -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"key":"idx_assignedTo","type":"key","attributes":["assignedToUserId"]}' | jq .

  curl -s -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/collections/$COLLECTION_ID/indexes" \
    -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
    -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"key":"idx_status","type":"key","attributes":["status"]}' | jq .

  echo "Provisioning complete. Review the collection in the Appwrite console to adjust roles/permissions." 
fi
