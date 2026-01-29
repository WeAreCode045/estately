const https = require('https');
const fs = require('fs');
const path = require('path');

function readEnv() {
  const envPath = './.env';
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2]; if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1);
    out[m[1]] = v;
  }
  return out;
}

const env = readEnv();
const ENDPOINT = env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1';
const PROJECT = env.VITE_APPWRITE_PROJECT_ID || env.APPWRITE_PROJECT || '69759f0f0003f89f3998';
const KEY = env.APPWRITE_KEY || env.VITE_APPWRITE_KEY;

if (!KEY) { console.error('Missing APPWRITE_KEY in .env'); process.exit(2); }

// create a small sample file and base64 it
const sample = 'Hello from test upload at ' + new Date().toISOString();
const b64 = Buffer.from(sample, 'utf8').toString('base64');
const filename = 'test-upload.txt';

const payloadObj = { filename, base64: b64 };
const executionBody = JSON.stringify({ payload: JSON.stringify(payloadObj) });

const url = new URL(`${ENDPOINT}/functions/upload-template/executions`);

const opts = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': PROJECT,
    'X-Appwrite-Key': KEY,
    'Content-Length': Buffer.byteLength(executionBody)
  }
};

const req = https.request(opts, (res) => {
  let data = '';
  res.on('data', (c) => data += c.toString());
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try { console.log('Response:', JSON.parse(data)); }
    catch (e) { console.log('Response:', data); }
  });
});
req.on('error', (e) => { console.error('Request error', e); });
req.write(executionBody);
req.end();
