# upload-template Appwrite Function

Purpose: receive a base64-encoded file payload from the client, upload it to Appwrite Storage using the function's privileged API key, and optionally update a template document with the new `fileId`.

Environment variables required:
- `APPWRITE_FUNCTION_ENDPOINT` — Appwrite endpoint (e.g. https://appwrite.example.com/v1)
- `APPWRITE_FUNCTION_PROJECT_ID` — Appwrite project ID
- `APPWRITE_FUNCTION_API_KEY` — API key with storage and databases permissions
- `STORAGE_BUCKET_ID` — storage bucket id to store files
- `DATABASE_ID` — (optional) database id to update template document
- `TEMPLATE_COLLECTION_ID` — (optional) collection id for templates

Payload (JSON passed to function execution):
```
{
  "filename": "contract.pdf",
  "base64": "<base64-encoded-file>",
  "templateId": "<optional-template-doc-id>",
  "metadata": { "title": "My Template" }
}
```

Response: JSON with `success` and the Appwrite storage `file` object on success.

Deploy: zip this folder and deploy via Appwrite console or the CLI. Ensure `package.json` is present so Appwrite installs dependencies.
