# Smoke test instructions for `projectFormsService`

These steps describe how to manually verify the `projectFormsService` using environment variables.

Prerequisites:
- Set environment variables: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`, `APPWRITE_API_KEY`, and `APPWRITE_COLLECTION_PROJECT_FORMS` (optional).
- Your Appwrite project must have the `project_forms` collection provisioned (see `scripts/provision_project_forms.sh`).

Manual test steps (using curl):

1. Create a submission (replace placeholders):

```bash
curl -X POST "$APPWRITE_ENDPOINT/v1/databases/$APPWRITE_DATABASE_ID/documents" \
  -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionId": "project_forms",
    "data": {
      "projectId": "<PROJECT_ID>",
      "formKey": "lijst_van_zaken",
      "title": "Test Submission",
      "data": "'"$(echo '{"foo":"bar"}' | jq -R -s @json)"'",
      "attachments": "'"$(echo '[]' | jq -R -s @json)"'",
      "submittedByUserId": "<USER_ID>",
      "status": "submitted"
    }
  }'
```

2. List submissions by project (use `projectFormsService.listByProject` in-app or query via Appwrite console).

3. Update a submission (change status to 'closed') using the Appwrite console or API.

4. Delete a submission and verify attachments are removed from storage (if attachments were used).

Note: The projectFormsService module in `services/projectFormsService.ts` expects Appwrite SDK connection via the same env variables used by other services in this repo. For programmatic smoke tests you can build a small Node.js script that imports the Appwrite SDK and calls the service methods using the same env variables.
