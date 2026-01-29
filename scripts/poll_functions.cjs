const { spawnSync } = require('child_process');
const fs = require('fs');

function readEnv() {
  const envPath = './.env';
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = readEnv();
const ENDPOINT = env.VITE_APPWRITE_ENDPOINT || env.APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1';
const PROJECT = env.VITE_APPWRITE_PROJECT_ID || env.APPWRITE_PROJECT || '69759f0f0003f89f3998';
const KEY = env.VITE_APPWRITE_FUNCTION_API_KEY || env.VITE_APPWRITE_KEY || env.APPWRITE_KEY || env.VITE_APPWRITE_PROJECT_KEY || env.VITE_APPWRITE_PROJECT;

if (!KEY) {
  console.error('No Appwrite key found in .env (VITE_APPWRITE_KEY or APPWRITE_KEY). Please set it.');
  process.exit(2);
}

const functionIds = ['process-template','upload-template'];
const timeoutSec = 300;
const intervalSec = 5;
let elapsed = 0;

console.log('Polling Appwrite functions for deployment status...');
console.log('Endpoint:', ENDPOINT);

while (elapsed < timeoutSec) {
  let allReady = true;
  for (const id of functionIds) {
    const cmd = ['-s','-X','GET', `${ENDPOINT}/functions/${id}`,'-H',`X-Appwrite-Project: ${PROJECT}`,'-H',`X-Appwrite-Key: ${KEY}`];
    const res = spawnSync('curl', cmd, { encoding: 'utf8' });
    if (res.error) {
      console.error('curl error for', id, res.error);
      allReady = false;
      continue;
    }
    let body = res.stdout || '';
    try {
      const json = JSON.parse(body);
      const status = json.latestDeploymentStatus || json.status || 'unknown';
      const latestId = json.latestDeploymentId || json.deploymentId || '';
      process.stdout.write(`${id}: ${status}` + (latestId ? ` (deploy ${latestId})` : '') + '\n');
      if (status !== 'ready') allReady = false;
    } catch (e) {
      console.error('Invalid JSON response for', id, '\n', body);
      allReady = false;
    }
  }
  if (allReady) {
    console.log('All functions ready');
    process.exit(0);
  }
  elapsed += intervalSec;
  const remaining = Math.max(0, timeoutSec - elapsed);
  process.stdout.write(`Waiting ${intervalSec}s... (timeout in ${remaining}s)\n`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, intervalSec * 1000);
}

console.error('Timeout waiting for function deployments to become ready');
process.exit(1);
