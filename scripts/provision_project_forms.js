#!/usr/bin/env node
/**
 * Provision Appwrite project_forms and form_definitions collections.
 *
 * Usage:
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_DATABASE_ID=... APPWRITE_API_KEY=... node scripts/provision_project_forms.js
 */

const { Client, Databases, Query, ID } = require('appwrite');

require('dotenv').config();

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;
const API_KEY = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY;
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_PROJECT_FORMS || 'project_forms';
const DEF_COLLECTION_ID = 'form_definitions';

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

async function ensureCollection(id, name) {
  try {
    console.log(`Checking for existing collection ${id}...`);
    const existing = await databases.getCollection(DATABASE_ID, id);
    console.log(`Collection ${id} already exists`);
    return existing;
  } catch (err) {
    console.log(`Collection ${id} not found, creating...`);
    try {
      const created = await databases.createCollection(DATABASE_ID, id, name, ['role:all'], ['role:all']);
      console.log(`Created collection: ${created.$id}`);
      return created;
    } catch (e) {
      console.error(`Failed to create collection ${id}:`, e);
      throw e;
    }
  }
}

async function ensureStringAttribute(collId, key, size = 65535, required = false) {
  try {
    console.log(`Adding attribute ${key} to ${collId}...`);
    await databases.createStringAttribute(DATABASE_ID, collId, key, size, required);
    console.log(`Added attribute ${key}`);
  } catch (e) {
    const msg = e?.response?.message || e?.message || e;
    if (String(msg).includes('already exists') || String(msg).includes('unique')) {
      console.log(`Attribute already exists: ${key}`);
    } else {
      console.warn(`Attribute creation warning for ${key}:`, msg);
    }
  }
}

async function ensureIndex(collId, key, type, attributes) {
  try {
    console.log(`Creating index ${key} for ${collId}...`);
    await databases.createIndex(DATABASE_ID, collId, key, type, attributes);
    console.log(`Created index ${key}`);
  } catch (e) {
    const msg = e?.response?.message || e?.message || e;
    if (String(msg).toLowerCase().includes('already exists') || String(msg).toLowerCase().includes('unique')) {
      console.log(`Index already exists: ${key}`);
    } else {
      console.warn(`Index creation warning for ${key}:`, msg);
    }
  }
}

async function main() {
  try {
    // 1. Provision Project Forms
    await ensureCollection(COLLECTION_ID, 'Project Forms');
    const formAttrs = ['projectId', 'formKey', 'title', 'data', 'attachments', 'submittedByUserId', 'assignedToUserId', 'status', 'meta'];
    for (const a of formAttrs) {
      await ensureStringAttribute(COLLECTION_ID, a, 65535, ['projectId', 'formKey', 'status'].includes(a));
    }
    await ensureIndex(COLLECTION_ID, 'idx_projectId', 'key', ['projectId']);
    await ensureIndex(COLLECTION_ID, 'idx_status', 'key', ['status']);

    // 2. Provision Form Definitions
    await ensureCollection(DEF_COLLECTION_ID, 'Form Definitions');
    const defAttrs = [
      { key: 'key', size: 255, required: true },
      { key: 'title', size: 255, required: true },
      { key: 'description', size: 65535, required: false },
      { key: 'schema', size: 65535, required: false },
      { key: 'defaultData', size: 65535, required: false },
      { key: 'role', size: 255, required: false }
    ];
    for (const a of defAttrs) {
      await ensureStringAttribute(DEF_COLLECTION_ID, a.key, a.size, a.required);
    }
    await ensureIndex(DEF_COLLECTION_ID, 'idx_key', 'unique', ['key']);

    // 3. Seed some templates
    console.log('Seeding templates...');
    const seeds = [
      { key: 'lijst_van_zaken', title: 'Lijst van Zaken', description: 'List of movable items included or excluded from the sale.', role: 'SELLER' },
      { key: 'vragenlijst_b', title: 'Vragenlijst Deel B', description: 'Informational questionnaire about the properties condition.', role: 'SELLER' }
    ];

    for (const s of seeds) {
      try {
        const existing = await databases.listDocuments(DATABASE_ID, DEF_COLLECTION_ID, [Query.equal('key', s.key)]);
        if (existing.total === 0) {
          await databases.createDocument(DATABASE_ID, DEF_COLLECTION_ID, ID.unique(), {
            ...s,
            schema: '{}',
            defaultData: '{}'
          });
          console.log(`Seeded: ${s.key}`);
        }
      } catch (e) {
        console.warn(`Seed failed for ${s.key}:`, e.message);
      }
    }

    console.log('Provisioning finished successfully!');
  } catch (e) {
    console.error('Provisioning failed:', e);
    process.exit(1);
  }
}

main();
