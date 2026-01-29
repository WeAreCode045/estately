const https = require('https');
const fs = require('fs');

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
const ENDPOINT = env.VITE_APPWRITE_ENDPOINT || env.APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1';
const PROJECT = env.VITE_APPWRITE_PROJECT || env.APPWRITE_PROJECT || env.APPWRITE_PROJECT_ID || '69759f0f0003f89f3998';
const KEY = env.APPWRITE_KEY || env.VITE_APPWRITE_KEY;
const FUNCTION_ID = env.VITE_APPWRITE_FUNCTION_FORM_SUBMIT_APPEND_ID || 'submit-form-append';

if (!KEY) { console.error('No APPWRITE_KEY in .env'); process.exit(2); }

const vars = [
  { key: 'APPWRITE_FUNCTION_ENDPOINT', value: ENDPOINT, secret: true },
  { key: 'APPWRITE_FUNCTION_PROJECT_ID', value: PROJECT, secret: true },
  { key: 'APPWRITE_FUNCTION_API_KEY', value: KEY, secret: true },
  { key: 'APPWRITE_FUNCTION_DATABASE_ID', value: env.DATABASE_ID || env.VITE_APPWRITE_DATABASE_ID || env.APPWRITE_DATABASE_ID || env.DATABASE_ID || '', secret: false },
  { key: 'VITE_APPWRITE_COLLECTION_PROFILES', value: env.VITE_APPWRITE_COLLECTION_PROFILES || env.APPWRITE_COLLECTION_PROFILES || 'profiles', secret: false }
];

function postVar(v) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(v);
    const url = new URL(`${ENDPOINT}/functions/${FUNCTION_ID}/variables`);
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Appwrite-Project': PROJECT,
        'X-Appwrite-Key': KEY
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c.toString());
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const v of vars) {
    if (!v.value) { console.warn('Skipping empty var', v.key); continue; }
    try {
      const r = await postVar(v);
      console.log(v.key, '->', r.status);
    } catch (e) {
      console.error('error posting', v.key, e);
    }
  }
})();
