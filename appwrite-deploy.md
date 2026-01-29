# Appwrite deployment guide — functions, buckets, collections

This document contains copy-paste commands and instructions to deploy the `process-template` Appwrite Function, create a storage bucket for PDFs, and create a database collection for templates.

Prerequisites
- Appwrite server URL (e.g. `https://appwrite.example.com/v1`) exported as `APPWRITE_ENDPOINT`
- Appwrite project ID exported as `APPWRITE_PROJECT`
- Appwrite API key (server/admin key) exported as `APPWRITE_KEY`
- Your frontend needs `VITE_APPWRITE_FUNCTION_PROCESS_TEMPLATE_ID` set to the function id you choose.

1) Zip the function (local)
```bash
chmod +x scripts/zip_function.sh
./scripts/zip_function.sh
```

2) Create a storage bucket (curl)
```bash
export APPWRITE_ENDPOINT="https://<your-appwrite-host>/v1"
export APPWRITE_PROJECT="<project-id>"
export APPWRITE_KEY="<your-secret-key>"

curl -s -X POST "${APPWRITE_ENDPOINT}/storage/buckets" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "bucketId": "documents",
    "name": "Documents",
    "read": ["*"],
    "write": ["*"]
  }'
```

3) Create a database collection for templates (curl)
- Replace `<databaseId>` with your database id.
```bash
export DATABASE_ID="<database-id>"

curl -s -X POST "${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionId": "file_templates",
    "name": "File Templates",
    "permissions": ["*"],
    "read": ["*"],
    "write": ["*"]
  }'
```

4) Add attributes (string/json) to the collection
```bash
# title (string)
curl -s -X POST "${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/file_templates/attributes/string" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "key": "title", "size": 255, "required": true }'

# fileId (string)
curl -s -X POST "${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/file_templates/attributes/string" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "key": "fileId", "size": 255, "required": true }'

# analysisStatus (string)
curl -s -X POST "${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/file_templates/attributes/string" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "key": "analysisStatus", "size": 64, "required": false }'

# formSchema (json)
curl -s -X POST "${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/file_templates/attributes/json" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "key": "formSchema", "required": false }'

# extractedSchema (json)
curl -s -X POST "${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/file_templates/attributes/json" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "key": "extractedSchema", "required": false }'

5) Deploy the function — minimal CURL approach

```bash
# Upload a new function (create)
curl -s -X POST "${APPWRITE_ENDPOINT}/functions" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -F "functionId=process-template" \
  -F "name=Process Template" \
  -F "runtime=node-js:18" \
  -F "entrypoint=index.js"

# Then create a deployment by uploading the zip
curl -s -X POST "${APPWRITE_ENDPOINT}/functions/process-template/deployments" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -F "code=@appwrite-functions/process-template/function.zip"

# Activate the deployment (replace <deploymentId> with the value returned)
curl -s -X PATCH "${APPWRITE_ENDPOINT}/functions/process-template/deployments/<deploymentId>" \
  -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
  -H "X-Appwrite-Key: ${APPWRITE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "activate": true }'
```

Notes & Troubleshooting
- If any curl returns 403/401, ensure `APPWRITE_KEY` is a valid project-level API key with the correct scopes (databases, storage, functions).
- If your Appwrite instance uses a different API path or port, adjust `APPWRITE_ENDPOINT` accordingly.
- For scanned PDFs you will need to integrate OCR (Google Cloud Vision) — replace `pdf-parse` extraction with Cloud Vision calls.

---

Optional: run included Node setup script

If you'd rather automate the curl steps, use the helper script in `scripts/appwrite_setup.js`. Install runtime deps then run:

```bash
npm install node-fetch@2 form-data
chmod +x scripts/zip_function.sh
./scripts/zip_function.sh
APPWRITE_ENDPOINT="https://<your-appwrite-host>/v1" \
APPWRITE_PROJECT="<project-id>" \
APPWRITE_KEY="<your-secret-key>" \
DATABASE_ID="<database-id>" \
node scripts/appwrite_setup.js
```

The script will attempt to create the `documents` bucket, the `file_templates` collection with attributes, create the `process-template` function (if missing), upload `function.zip` and activate the deployment.
