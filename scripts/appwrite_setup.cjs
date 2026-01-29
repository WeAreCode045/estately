#!/usr/bin/env node
/*
  Appwrite setup script (CommonJS)
  Usage: APPWRITE_ENDPOINT=https://appwrite.example.com/v1 \
         APPWRITE_PROJECT=<projectId> \
         APPWRITE_KEY=<secretKey> \
         DATABASE_ID=<databaseId> \
         node scripts/appwrite_setup.cjs

  This script will:
  - create a storage bucket `documents`
  - create a collection `file_templates` with attributes
  - upload and deploy the function `process-template` using appwrite-functions/process-template/function.zip
*/

const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');
const child_process = require('child_process');

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
  console.log(`Creating text attribute (for JSON payload): ${key}`);
  const body = JSON.stringify({ key, size: 65535, required: false });
  return await req('POST', `/databases/${DATABASE_ID}/collections/file_templates/attributes/text`, body, { 'Content-Type': 'application/json' });
}

async function createFunction() {
  console.log('Creating function: process-template (if not exists)');
  const runtimes = ['node-22', 'node-21.0', 'node-20.0', 'node-19.0', 'node-18.0', 'node-16.0'];
  for (const runtime of runtimes) {
    try {
      const body = JSON.stringify({ functionId: 'process-template', name: 'Process Template', runtime, entrypoint: 'index.js' });
      const resp = await req('POST', '/functions', body, { 'Content-Type': 'application/json' });
      console.log('Function created with runtime', runtime);
      return resp;
    } catch (e) {
      console.warn('createFunction runtime', runtime, 'failed:', e.message);
      // try next runtime
    }
  }
  throw new Error('Failed to create function with available runtimes');
}

async function uploadDeployment() {
  const zipPath = `${__dirname}/../appwrite-functions/process-template/function.zip`;
  if (!fs.existsSync(zipPath)) throw new Error(`Function zip not found at ${zipPath}. Run scripts/zip_function.sh first.`);
  console.log('Uploading deployment from', zipPath);
  const form = new FormData();
  form.append('code', fs.createReadStream(zipPath));
  form.append('activate', 'true');
  try {
    const json = await req('POST', `/functions/process-template/deployments`, form, form.getHeaders());
    console.log('Deployment created:', json);
    return json;
  } catch (err) {
    // If Appwrite rejects the zip extension, try a tar.gz
    const msg = (err && err.message) ? err.message : String(err);
    console.warn('Initial deployment failed:', msg);
    if (msg.includes('file extension is not supported') || msg.includes('unsupported')) {
      const tarPath = `${__dirname}/../function.tar.gz`;
      const srcDir = `${__dirname}/../appwrite-functions/process-template`;
      console.log('Creating tarball', tarPath, 'from', srcDir);
      // Create tarball in project root to avoid including archive into itself
      child_process.execSync(`tar -C ${srcDir} -czf ${tarPath} .`);
      const form2 = new FormData();
      form2.append('code', fs.createReadStream(tarPath));
      form2.append('activate', 'true');
      const json2 = await req('POST', `/functions/process-template/deployments`, form2, form2.getHeaders());
      console.log('Deployment created with tarball:', json2);
      return json2;
    }
    throw err;
  }
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
