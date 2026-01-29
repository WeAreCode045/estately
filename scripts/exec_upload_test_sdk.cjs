const sdk = require('node-appwrite');
const fs = require('fs');

const envPath = './.env';
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!m) return; let v = m[2]; if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1); env[m[1]] = v;
  });
}

const client = new sdk.Client()
  .setEndpoint(env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1')
  .setProject(env.VITE_APPWRITE_PROJECT_ID || env.APPWRITE_PROJECT || '69759f0f0003f89f3998')
  .setKey(env.APPWRITE_KEY || env.VITE_APPWRITE_KEY);

const functions = new sdk.Functions(client);

const sample = 'Hello from SDK upload test ' + new Date().toISOString();
const payloadObj = { filename: 'sdk-test.txt', base64: Buffer.from(sample).toString('base64'), bucketId: 'documents' };

(async () => {
  try {
    const res = await functions.createExecution('upload-template', JSON.stringify(payloadObj), true);
    console.log('Execution create response:', res);
  } catch (err) {
    console.error('Execution error:', err);
  }
})();
