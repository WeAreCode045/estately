const { spawnSync } = require('child_process');
const fs = require('fs');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1';
const PROJECT = process.env.APPWRITE_PROJECT || process.env.VITE_APPWRITE_PROJECT || '69759f0f0003f89f3998';
const KEY = process.env.APPWRITE_KEY || process.env.VITE_APPWRITE_KEY;
const FUNCTION_ID = process.env.VITE_APPWRITE_FUNCTION_FORM_SUBMIT_APPEND_ID || 'submit-form-append';

if (!KEY) {
  console.error('Missing APPWRITE_KEY in env (APPWRITE_KEY or VITE_APPWRITE_KEY)');
  process.exit(2);
}

const outDir = '/tmp/estately_deploy';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const tarPath = `${outDir}/${FUNCTION_ID}.tar.gz`;

console.log('Creating tarball:', tarPath);
const tar = spawnSync('tar', ['-C', `appwrite-functions/${FUNCTION_ID}`, '-czf', tarPath, '.'], { stdio: 'inherit' });
if (tar.status !== 0) {
  console.error('tar failed with status', tar.status);
  process.exit(3);
}

console.log('Creating function resource (idempotent)');
const createArgs = [
  '-s',
  '-X', 'POST',
  `${ENDPOINT}/functions`,
  '-H', `X-Appwrite-Project: ${PROJECT}`,
  '-H', `X-Appwrite-Key: ${KEY}`,
  '-H', 'Content-Type: application/json',
  '-d', JSON.stringify({ functionId: FUNCTION_ID, name: 'Submit Form Append', runtime: 'node-16.0', entrypoint: 'index.js' })
];
const create = spawnSync('curl', createArgs, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
if (create.error) console.error('create error', create.error);
console.log('create stdout:', create.stdout || '(no stdout)');
console.error('create stderr:', create.stderr || '(no stderr)');

console.log('Uploading deployment and activating');
const deployArgs = [
  '-s',
  '-X', 'POST',
  `${ENDPOINT}/functions/${FUNCTION_ID}/deployments`,
  '-H', `X-Appwrite-Project: ${PROJECT}`,
  '-H', `X-Appwrite-Key: ${KEY}`,
  '-F', `code=@${tarPath}`,
  '-F', 'activate=true'
];
const deploy = spawnSync('curl', deployArgs, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
if (deploy.error) console.error('deploy error', deploy.error);
const deployOut = deploy.stdout || '';
console.log('--- DEPLOY RESPONSE ---');
console.log(deployOut || '(no response)');
console.error('deploy stderr:', deploy.stderr || '(no stderr)');

console.log('Listing functions for verification');
const list = spawnSync('curl', ['-s', '-X', 'GET', `${ENDPOINT}/functions`, '-H', `X-Appwrite-Project: ${PROJECT}`, '-H', `X-Appwrite-Key: ${KEY}`], { encoding: 'utf8' });
console.log(list.stdout || '(no list response)');

// Save deploy response to file for inspection
try { fs.writeFileSync(`${outDir}/${FUNCTION_ID}-deploy.json`, deployOut); } catch (e) { /* ignore */ }

// Exit with non-zero if deploy response empty
if (!deployOut || deployOut.trim().length === 0) process.exit(4);

console.log('Done.');
