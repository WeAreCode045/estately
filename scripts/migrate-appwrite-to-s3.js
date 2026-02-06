#!/usr/bin/env node
/**
 * Simple migration helper: download files from Appwrite Storage and upload to S3.
 * This is a best-effort script template — test on a small dataset first.
 *
 * Required env vars:
 *  - APPWRITE_ENDPOINT (e.g. https://api.example.com)
 *  - APPWRITE_PROJECT
 *  - APPWRITE_KEY
 *  - APPWRITE_DATABASE_ID
 *  - S3_REGION
 *  - S3_BUCKET
 *  - AWS_ACCESS_KEY_ID
 *  - AWS_SECRET_ACCESS_KEY
 *
 * Usage: node migrate-appwrite-to-s3.js <collectionId>
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fetch = globalThis.fetch || require('node-fetch');

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || process.env.VITE_APPWRITE_PROJECT;
const APPWRITE_KEY = process.env.APPWRITE_KEY || process.env.VITE_APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;

const S3_REGION = process.env.S3_REGION || process.env.VITE_AWS_REGION || 'eu-central-1';
const S3_BUCKET = process.env.S3_BUCKET || process.env.VITE_AWS_S3_BUCKET || 'estately-storage';

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_KEY || !DATABASE_ID) {
  console.error('Missing Appwrite configuration in env. Aborting.');
  process.exit(1);
}

if (!S3_BUCKET) {
  console.error('Missing S3_BUCKET in env. Aborting.');
  process.exit(1);
}

const s3 = new S3Client({ region: S3_REGION });

async function listDocuments(collectionId) {
  const url = `${APPWRITE_ENDPOINT.replace(/\/$/, '')}/v1/databases/${DATABASE_ID}/collections/${collectionId}/documents`;
  const res = await fetch(url, { headers: { 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY } });
  if (!res.ok) throw new Error(`Failed listing documents: ${res.statusText}`);
  return res.json();
}

async function downloadAppwriteFile(fileId) {
  const url = `${APPWRITE_ENDPOINT.replace(/\/$/, '')}/v1/storage/files/${fileId}/download`;
  const res = await fetch(url, { headers: { 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY } });
  if (!res.ok) throw new Error(`Failed downloading file ${fileId}: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || undefined;
  const cd = res.headers.get('content-disposition') || '';
  let filename = fileId;
  const m = cd.match(/filename="?([^";]+)"?/);
  if (m) filename = m[1];
  return { buffer: Buffer.from(arrayBuffer), contentType, filename };
}

async function uploadToS3(key, body, contentType) {
  const cmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType });
  await s3.send(cmd);
}

function findFileIdsInDoc(doc) {
  // Naive heuristic: gather any values named fileId, file, url in nested objects/arrays
  const found = [];
  function walk(obj, path = []) {
    if (!obj) return;
    if (Array.isArray(obj)) return obj.forEach((v, i) => walk(v, path.concat(i)));
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (k.toLowerCase().includes('file') && typeof obj[k] === 'string') {
          found.push({ path: path.concat(k).join('.'), value: obj[k] });
        } else {
          walk(obj[k], path.concat(k));
        }
      }
    }
  }
  walk(doc);
  return found;
}

async function updateDocument(collectionId, documentId, payload) {
  const url = `${APPWRITE_ENDPOINT.replace(/\/$/, '')}/v1/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed updating document ${documentId}: ${res.statusText}`);
  return res.json();
}

async function migrateCollection(collectionId) {
  console.log('Listing documents for', collectionId);
  const res = await listDocuments(collectionId);
  const docs = res.documents || [];
  for (const doc of docs) {
    const fileRefs = findFileIdsInDoc(doc);
    if (fileRefs.length === 0) continue;
    console.log(`Doc ${doc.$id} has ${fileRefs.length} file refs`);
    const updates = {};
    for (const ref of fileRefs) {
      const fileId = ref.value;
      // Skip already-migrated (heuristic: contains '/project/' or '/general/')
      if (typeof fileId === 'string' && (fileId.startsWith('project/') || fileId.startsWith('general/') || fileId.startsWith('agency/'))) {
        console.log('Already looks like S3 key, skipping:', fileId);
        continue;
      }
      try {
        const { buffer, contentType, filename } = await downloadAppwriteFile(fileId);
        const key = `migrated/${doc.$id}/${Date.now()}_${filename}`;
        await uploadToS3(key, buffer, contentType);
        console.log('Uploaded to S3 as', key);
        // Prepare a shallow payload to replace occurrences of fileId with S3 key
        updates[ref.path] = key;
      } catch (e) {
        console.error('Failed migrating file', fileId, e.message);
      }
    }

    if (Object.keys(updates).length > 0) {
      // Build patch payload: flatten paths into nested updates is complex; as a safe default,
      // write a new field `migratedFiles` with mapping of original -> new
      const payload = { ...(doc.migratedFiles || {}), migratedFiles: { ...(doc.migratedFiles || {}), ...updates } };
      await updateDocument(collectionId, doc.$id, payload);
      console.log('Updated doc', doc.$id, 'with migratedFiles mapping');
    }
  }
}

async function main() {
  const collectionId = process.argv[2];
  if (!collectionId) {
    console.error('Usage: node migrate-appwrite-to-s3.js <collectionId>');
    process.exit(1);
  }
  await migrateCollection(collectionId);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
