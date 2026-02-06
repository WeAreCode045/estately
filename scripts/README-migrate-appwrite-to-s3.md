Migration helper: Appwrite -> S3

This repository includes a best-effort Node script to help migrate file references stored in Appwrite to S3.

Location: `scripts/migrate-appwrite-to-s3.js`

What it does
- Lists documents in a specified Appwrite collection.
- Naively scans document fields for file-like values (keys that include "file") and attempts to download those Appwrite files.
- Uploads downloaded files to the configured S3 bucket under a `migrated/{docId}/` prefix.
- Writes a `migratedFiles` object to each document containing a mapping of original field path -> new S3 key.

Important notes & safety
- This is a conservative template. It does NOT mutate original fileId fields in-place because arbitrary nested update paths are error-prone.
- Test on a small collection first and verify outputs before performing broader migration.
- Ensure you have backups or DB exports.

Env vars required
- `APPWRITE_ENDPOINT` — e.g. `https://api.example.com`
- `APPWRITE_PROJECT`
- `APPWRITE_KEY`
- `APPWRITE_DATABASE_ID`
- `S3_REGION` (optional, defaults to `eu-central-1`)
- `S3_BUCKET`
- AWS creds in environment (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) or configured via standard AWS credential providers.

Run
```bash
APPWRITE_ENDPOINT="https://api.example.com" \
APPWRITE_PROJECT="my-project" \
APPWRITE_KEY="secret" \
APPWRITE_DATABASE_ID="dbId" \
S3_BUCKET="code045-estately" \
node scripts/migrate-appwrite-to-s3.js <collectionId>
```

After migrating
- Inspect the `migratedFiles` map on documents to decide whether to update original fields in-place or to perform a more tailored migration.
