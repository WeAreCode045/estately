#!/usr/bin/env node
/**
 * Provision Appwrite `project_forms` collection using Appwrite JS SDK.
 *
 * Usage:
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_DATABASE_ID=... APPWRITE_API_KEY=... node scripts/provision_project_forms.js
 */

const { Client, Databases } = require('appwrite');

require('dotenv').config();

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;
const API_KEY = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY;
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_PROJECT_FORMS || 'project_forms';

if (!ENDPOINT || !PROJECT || !DATABASE_ID || !API_KEY) {
  console.error('Missing required env vars. Please set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client();
client
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY);

const databases = new Databases(client);

async function ensureCollection() {
  try {
    console.log('Checking for existing collection...', COLLECTION_ID);
    const existing = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
    console.log('Collection already exists:', existing.$id);
    return existing;
  } catch (err) {
    console.log('Collection not found, creating...');
    try {
      const created = await databases.createCollection(DATABASE_ID, COLLECTION_ID, 'Project Forms', ['role:all'], ['role:all']);
      console.log('Created collection:', created.$id);
      return created;
    } catch (e) {
      console.error('Failed to create collection:', e);
      throw e;
    }
  }
}

async function ensureStringAttribute(key, size = 65535, required = false) {
  try {
    console.log(`Adding attribute ${key}...`);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, key, size, required);
    console.log('Added attribute', key);
  } catch (e) {
    const msg = e?.response || e?.message || e;
    if (String(msg).includes('already exists') || String(msg).includes('unique')) {
      console.log('Attribute already exists:', key);
    } else {
      console.warn('Attribute creation warning:', key, msg);
    }
  }
}

async function ensureIndex(key, type, attributes) {
  try {
    console.log(`Creating index ${key}...`);
    await databases.createIndex(DATABASE_ID, COLLECTION_ID, key, type, attributes);
    console.log('Created index', key);
  } catch (e) {
    const msg = e?.response || e?.message || e;
    if (String(msg).toLowerCase().includes('already exists') || String(msg).toLowerCase().includes('unique')) {
      console.log('Index already exists:', key);
    } else {
      console.warn('Index creation warning:', key, msg);
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
      await ensureStringAttribute(a, 65535, a === 'projectId' || a === 'formKey' || a === 'submittedByUserId' || a === 'status');
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
