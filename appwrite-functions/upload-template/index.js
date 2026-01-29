const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
  .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

const storage = new sdk.Storage(client);
const databases = new sdk.Databases(client);
const ID = sdk.ID;

function tmpPath(filename) {
  return path.join('/tmp', `${Date.now()}-${filename}`);
}

module.exports = async function (req, res) {
  function sendResponse(body, status = 200) {
    if (res && typeof res.json === 'function') {
      try { return res.json(body, status); } catch (e) { /* fallthrough */ }
    }
    // Fallback for runtimes that don't provide `res.json`
    const out = { status, body };
    console.log('FUNCTION_RESPONSE', JSON.stringify(out));
    return out;
  }

  try {
    console.log('upload-template invoked. req keys:', Object.keys(req || {}));
    console.log('req.payload type:', typeof (req && req.payload), 'value:', req && req.payload);
    // Support multiple wrapper shapes from different Appwrite runtime versions
    const maybe = (r) => r !== undefined && r !== null;
    let rawPayload = undefined;
    console.log('inner req keys:', req && req.req ? Object.keys(req.req) : '(no inner req)');
    console.log('inner req.body type:', req && req.req ? typeof req.req.body : '(no inner req)');
    if (req && req.req) {
      const bt = req.req.bodyText || '';
      console.log('bodyText length:', bt ? bt.length : 0, 'preview:', bt ? bt.slice(0,200) : '(empty)');
    }
    if (maybe(req.payload)) rawPayload = req.payload;
    else if (maybe(req.req) && maybe(req.req.payload)) rawPayload = req.req.payload;
    else if (maybe(req.body)) rawPayload = req.body;
    else if (maybe(req.req) && maybe(req.req.bodyText)) rawPayload = req.req.bodyText;
    else if (maybe(req.req) && maybe(req.req.bodyRaw)) rawPayload = req.req.bodyRaw;
    else if (maybe(req.req)) {
      try { if (maybe(req.req.bodyJson)) rawPayload = req.req.bodyJson; } catch (e) { /* ignore JSON parse errors */ }
    }
    else if (maybe(req.req) && maybe(req.req.body)) rawPayload = req.req.body;

    let payload = {};
    if (maybe(rawPayload)) {
      if (typeof rawPayload === 'string') {
        try { payload = JSON.parse(rawPayload); } catch (e) { payload = {}; }
      } else if (typeof rawPayload === 'object') {
        payload = rawPayload;
      }
    }
    const { filename, base64, templateId, metadata } = payload || {};

    if (!filename || !base64) return sendResponse({ error: 'filename and base64 required' }, 400);

    // Force uploads for templates into the `doc-templates` bucket unless overridden via env
    const bucketId = process.env.DOC_TEMPLATE_BUCKET_ID || process.env.STORAGE_BUCKET_ID || 'doc-templates';
    const databaseId = process.env.DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.TEMPLATE_COLLECTION_ID || process.env.VITE_APPWRITE_COLLECTION_TEMPLATES || process.env.APPWRITE_COLLECTION_TEMPLATES;

    if (!bucketId) return sendResponse({ error: 'STORAGE_BUCKET_ID not configured' }, 500);

    const tmp = tmpPath(filename);
    const buf = Buffer.from(base64, 'base64');
    fs.writeFileSync(tmp, buf);

    const stream = fs.createReadStream(tmp);
    console.log('tmp file exists:', fs.existsSync(tmp), 'size:', fs.existsSync(tmp) ? fs.statSync(tmp).size : 0, 'tmp path:', tmp);

    // Fallback: upload directly to Appwrite Storage REST endpoint via multipart/form-data
    async function uploadViaHttp(bucketId, filepath, filename) {
      const FormData = require('form-data');
      const https = require('https');

      const form = new FormData();
      const genId = ID.unique();
      form.append('file', fs.createReadStream(filepath), { filename });
      // Appwrite storage endpoint may require a fileId form field in some versions
      form.append('fileId', genId);
      // optional permissions fields if needed by instance (leave blank by default)
      // form.append('read', '[]');
      // form.append('write', '[]');

      const endpoint = (process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1').replace(/\/$/, '');
      const url = new URL(`${endpoint}/storage/buckets/${bucketId}/files`);

      const headers = Object.assign({}, form.getHeaders(), {
        'X-Appwrite-Project': process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY
      });

      return new Promise((resolve, reject) => {
        const req = https.request({
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          headers
        }, (resHttp) => {
          let data = '';
          resHttp.on('data', (c) => data += c.toString());
          resHttp.on('end', () => {
            try { const json = JSON.parse(data); return resolve(json); } catch (e) { return reject(new Error('Invalid JSON response from storage upload: ' + data)); }
          });
        });
        req.on('error', (err) => reject(err));
        form.pipe(req);
      });
    }

    let file;
    try {
      file = await uploadViaHttp(bucketId, tmp, filename);
      console.log('Uploaded file via HTTP:', file && file.$id);
      // attach metadata/update template if provided
      if (templateId && databaseId && collectionId) {
        try {
          await databases.updateDocument(databaseId, collectionId, templateId, {
            fileId: file.$id,
            analysisStatus: 'PENDING',
            updatedAt: new Date().toISOString(),
            ...(metadata || {})
          });
          console.log('Updated template document', templateId, 'with fileId', file.$id);
        } catch (eUpdate) {
          console.warn('Failed updating template document:', String(eUpdate));
        }
      } else if (!templateId && databaseId && collectionId) {
        // Create a new template/document record for this upload
        try {
          const docBody = {
            // Appwrite collection may require a `name` attribute; ensure it's present
            name: (metadata && metadata.title) || filename,
            title: (metadata && metadata.title) || filename,
            description: (metadata && metadata.description) || '',
            fileId: file.$id,
            analysisStatus: 'PENDING',
            rolesAssigned: (metadata && metadata.rolesAssigned) || ['BUYER', 'SELLER'],
            createdAt: new Date().toISOString(),
            ...(metadata || {})
          };
          const created = await databases.createDocument(databaseId, collectionId, ID.unique(), docBody);
          console.log('Created template/document record', (created && created.$id) || '(unknown)');
          // expose created document to caller
          file._createdDocument = created;
          var createdDocument = created;
        } catch (eCreate) {
          console.warn('Failed creating template/document record:', String(eCreate));
        }
      }
    } catch (e) {
      console.error('storage.createFile failed (http fallback):', e);
      throw e;
    }

    // cleanup
    try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }

    return sendResponse({ success: true, file, createdDocument: typeof createdDocument !== 'undefined' ? createdDocument : null }, 200);
  } catch (err) {
    console.error('upload-template error:', err);
    return sendResponse({ error: String(err) }, 500);
  }
};
