#!/usr/bin/env node
/*
  Appwrite setup script
  Usage: APPWRITE_ENDPOINT=https://appwrite.example.com/v1 \
         APPWRITE_PROJECT=<projectId> \
         APPWRITE_KEY=<secretKey> \
         DATABASE_ID=<databaseId> \
         node scripts/appwrite_setup.js

  This script will:
  - create a storage bucket `documents`
  - create a collection `file_templates` with attributes
  - upload and deploy the function `process-template` using appwrite-functions/process-template/function.zip
*/

const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT = process.env.APPWRITE_PROJECT;
const KEY = process.env.APPWRITE_KEY;
const DATABASE_ID = process.env.DATABASE_ID;

if (!ENDPOINT || !PROJECT || !KEY || !DATABASE_ID) {
  console.error('Missing required env vars. See top of file for usage.');
  process.exit(1);
}

const headers = {
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': KEY,
};

async function req(method, path, body, extraHeaders = {}) {
  const url = `${ENDPOINT}${path}`;
  const opts = { method, headers: { ...headers, ...extraHeaders } };
  if (body) opts.body = body;
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = text; }
  if (!res.ok) {
    throw new Error(`Request ${method} ${url} failed: ${res.status} ${res.statusText} - ${JSON.stringify(json)}`);
  }
  return json;
}

async function createBucket() {
  console.log('Creating storage bucket: documents');
  const body = JSON.stringify({ bucketId: 'documents', name: 'Documents', read: ['*'], write: ['*'] });
  return await req('POST', '/storage/buckets', body, { 'Content-Type': 'application/json' });
}

async function createCollection() {
  console.log('Creating collection: file_templates');
  const body = JSON.stringify({ collectionId: 'file_templates', name: 'File Templates' });
  return await req('POST', `/databases/${DATABASE_ID}/collections`, body, { 'Content-Type': 'application/json' });
}

async function createAttributeString(key, size = 255, required = false) {
  console.log(`Creating string attribute: ${key}`);
  const body = JSON.stringify({ key, size, required });
  return await req('POST', `/databases/${DATABASE_ID}/collections/file_templates/attributes/string`, body, { 'Content-Type': 'application/json' });
}

async function createAttributeJson(key) {
  console.log(`Creating json attribute: ${key}`);
  const body = JSON.stringify({ key, required: false });
  return await req('POST', `/databases/${DATABASE_ID}/collections/file_templates/attributes/json`, body, { 'Content-Type': 'application/json' });
}

async function createFunction() {
  console.log('Creating function: process-template (if not exists)');
  const body = JSON.stringify({ functionId: 'process-template', name: 'Process Template', runtime: 'node-js:18', entrypoint: 'index.js' });
  return await req('POST', '/functions', body, { 'Content-Type': 'application/json' });
}

async function uploadDeployment() {
  const zipPath = `${__dirname}/../appwrite-functions/process-template/function.zip`;
  if (!fs.existsSync(zipPath)) throw new Error(`Function zip not found at ${zipPath}. Run scripts/zip_function.sh first.`);
  console.log('Uploading deployment from', zipPath);
  const form = new FormData();
  form.append('code', fs.createReadStream(zipPath));
  const json = await req('POST', `/functions/process-template/deployments`, form, form.getHeaders());
  console.log('Deployment created:', json);
  return json;
}

async function activateDeployment(deploymentId) {
  console.log('Activating deployment:', deploymentId);
  const body = JSON.stringify({ activate: true });
  return await req('PATCH', `/functions/process-template/deployments/${deploymentId}`, body, { 'Content-Type': 'application/json' });
}

async function main() {
  try {
    await createBucket();
  } catch (e) { console.warn('createBucket:', e.message); }
  try {
    await createCollection();
  } catch (e) { console.warn('createCollection:', e.message); }

  try { await createAttributeString('title', 255, true); } catch (e) { console.warn(e.message); }
  try { await createAttributeString('fileId', 255, true); } catch (e) { console.warn(e.message); }
  try { await createAttributeString('analysisStatus', 64, false); } catch (e) { console.warn(e.message); }
  try { await createAttributeJson('formSchema'); } catch (e) { console.warn(e.message); }
  try { await createAttributeJson('extractedSchema'); } catch (e) { console.warn(e.message); }

  try { await createFunction(); } catch (e) { console.warn('createFunction:', e.message); }
  let deployment;
  try {
    deployment = await uploadDeployment();
    const deploymentId = deployment.$id || deployment.response?.$id || deployment['$id'];
    if (deploymentId) {
      await activateDeployment(deploymentId);
      console.log('Deployment activated');
    } else {
      console.warn('Could not determine deployment id from response:', deployment);
    }
  } catch (e) { console.warn('uploadDeployment:', e.message); }

  console.log('Done. Set VITE_APPWRITE_FUNCTION_PROCESS_TEMPLATE_ID=process-template in your frontend .env');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
