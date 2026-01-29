# process-template Appwrite Function

Purpose: download uploaded PDF templates, extract text (via `pdf-parse`), call an LLM to produce a structured `formSchema` and `htmlPreview`, and update the template document in Appwrite.

Required environment variables (set in the Appwrite Function environment):
- `APPWRITE_FUNCTION_ENDPOINT` — Appwrite server endpoint (e.g. `https://example.com/v1`).
- `APPWRITE_FUNCTION_PROJECT_ID` — Appwrite project ID.
- `APPWRITE_FUNCTION_API_KEY` — API key with permissions to update the templates collection.
- `STORAGE_BUCKET_ID` — Appwrite storage bucket id where uploaded PDFs are stored.
- `DATABASE_ID` — Appwrite database id.
- `TEMPLATE_COLLECTION_ID` — Collection id for doc templates.
- `LLM_API_KEY` — API key for chosen LLM provider (OpenAI Key, or provider-specific key).
- Optional: `LLM_PROVIDER` — `openai` (default) or `custom`.
- Optional: `LLM_ENDPOINT` — custom LLM endpoint; when using OpenAI this can be omitted.
- Optional: `LLM_MODEL` — model name to call (default set in code).

Invocation:
- The function expects payload JSON with at least `fileId` (the storage file id). Optionally include `templateId` to update the template document record.

Example payload (when invoking the function):
{
  "templateId": "<DOCUMENT_ID>",
  "fileId": "<STORAGE_FILE_ID>"
}

Notes:
- This function uses `pdf-parse` to extract textual content from digital PDFs. For scanned PDFs (images), integrate Google Cloud Vision OCR (recommended) or Tesseract and replace the extraction step.
- The LLM prompt is conservative: it expects a single valid JSON object in response. If an LLM returns non-JSON, the function attempts to recover JSON from the response.
- Keep your LLM and Appwrite API keys secret and set them in the function environment variables in Appwrite.

Deployment:
1. Zip the contents of this folder and upload it as a Node.js function (or use the Appwrite CLI). Ensure `package.json` is present so Appwrite installs dependencies.
2. Set the environment variables described above in the function settings.
3. Invoke the function with a payload containing `fileId` (and `templateId` if you want the function to update the DB record).
