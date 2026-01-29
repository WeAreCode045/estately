#!/usr/bin/env node
/**
 * Provision Appwrite `project_forms` collection using Appwrite JS SDK (CommonJS).
 *
 * Usage:
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_DATABASE_ID=... APPWRITE_API_KEY=... node scripts/provision_project_forms.cjs
 */

// const { Client, Databases } = require('appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;
const API_KEY = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY;
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_PROJECT_FORMS || 'project_forms';

if (!ENDPOINT || !PROJECT || !DATABASE_ID || !API_KEY) {
  console.error('Missing required env vars. Please set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY');
  process.exit(1);
}


const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': API_KEY
};

async function ensureCollection() {
  try {
    console.log('Checking for existing collection...', COLLECTION_ID);
    const existing = await apiGet(`/databases/${DATABASE_ID}/collections/${COLLECTION_ID}`);
    console.log('Collection already exists:', existing.$id || COLLECTION_ID);
    return existing;
  } catch (err) {
    console.log('Collection not found, creating...');
    try {
      const created = await apiPost(`/databases/${DATABASE_ID}/collections`, {
        collectionId: COLLECTION_ID,
        name: 'Project Forms',
        read: ['role:all'],
        write: ['role:all']
      });
      console.log('Created collection:', created.$id || COLLECTION_ID);
      return created;
    } catch (e) {
      console.error('Failed to create collection:', e);
      throw e;
    }
  }
}

async function apiGet(path) {
  const res = await fetch(`${ENDPOINT}${path}`, { headers });
  if (!res.ok) throw res;
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${ENDPOINT}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    let text = '';
    try { text = await res.text(); } catch (e) { text = String(e); }
    const err = new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    err.status = res.status;
    err.statusText = res.statusText;
    err.body = text;
    throw err;
  }
  return res.json();
}

async function ensureStringAttribute(key, size = 65535, required = false) {
  try {
    console.log(`Adding attribute ${key}...`);
    const body = { key, size, required };
    await apiPost(`/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/attributes/string`, body);
    console.log('Added attribute', key);
  } catch (e) {
    console.warn('Attribute creation warning (may already exist):', key, e.statusText || e.status || e);
  }
}

async function deleteAttribute(key) {
  try {
    console.log(`Deleting attribute ${key} if exists...`);
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/attributes/${key}`, { method: 'DELETE', headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.log(`Delete attribute response for ${key}:`, res.status, res.statusText, text);
      return false;
    }
    console.log('Deleted attribute', key);
    return true;
  } catch (e) {
    console.warn('Error deleting attribute', key, e && e.message ? e.message : e);
    return false;
  }
}

async function ensureIndex(key, type, attributes) {
  try {
    console.log(`Creating index ${key}...`);
    const created = await apiPost(`/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/indexes`, { key, type, attributes });
    console.log('Created index', key, created);
  } catch (e) {
    if (e && e.body) {
      console.warn('Index creation failed (body):', key, e.body);
    } else {
      console.warn('Index creation warning:', key, e && e.message ? e.message : e);
    }
  }
}

async function main() {
  try {
    await ensureCollection();

    // Attributes to add
    const attrs = [
      'projectId',
      'formKey',
      'title',
      'data',
      'attachments',
      'submittedByUserId',
      'assignedToUserId',
      'status',
      'meta'
    ];

      for (const a of attrs) {
        await ensureStringAttribute(a, 65535, ['projectId', 'formKey', 'submittedByUserId', 'status'].includes(a));
      }

      // For indexed attributes, ensure small size (delete + recreate with size 255) to avoid index length errors
      const indexedAttrs = ['projectId', 'submittedByUserId', 'assignedToUserId', 'status'];
      for (const ia of indexedAttrs) {
        // Delete existing attribute (if large) and recreate with smaller size
        await deleteAttribute(ia);
        await ensureStringAttribute(ia, 255, ia === 'projectId' || ia === 'submittedByUserId' || ia === 'status');
      }

    // Indexes
    await ensureIndex('idx_projectId', 'key', ['projectId']);
    await ensureIndex('idx_submittedBy', 'key', ['submittedByUserId']);
    await ensureIndex('idx_assignedTo', 'key', ['assignedToUserId']);
    await ensureIndex('idx_status', 'key', ['status']);

    console.log('Provisioning finished. Verify collection settings in Appwrite console.');
  } catch (e) {
    console.error('Provisioning failed:', e);
    process.exit(1);
  }
}

main();
