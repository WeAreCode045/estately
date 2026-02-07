/**
 * Migration script to move data from 'agency' collection to 'agencies' collection
 *
 * This script:
 * 1. Fetches all documents from the 'agency' collection
 * 2. Creates corresponding documents in the 'agencies' collection
 * 3. Optionally deletes the old 'agency' collection
 *
 * Run with: node scripts/migrate_agency_to_agencies.cjs
 */

const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

async function migrateAgencyToAgencies() {
  console.log('🚀 Starting migration from "agency" to "agencies" collection...\n');

  try {
    // Step 1: Check if 'agency' collection exists and fetch documents
    console.log('📥 Fetching documents from "agency" collection...');
    let agencyDocs = [];
    try {
      const response = await databases.listDocuments(DATABASE_ID, 'agency');
      agencyDocs = response.documents;
      console.log(`✅ Found ${agencyDocs.length} document(s) in "agency" collection\n`);
    } catch (error) {
      if (error.code === 404) {
        console.log('⚠️ "agency" collection not found or already migrated');
        return;
      }
      throw error;
    }

    if (agencyDocs.length === 0) {
      console.log('ℹ️ No documents to migrate');
      return;
    }

    // Step 2: Check if 'agencies' collection exists
    console.log('🔍 Checking if "agencies" collection exists...');
    try {
      await databases.listDocuments(DATABASE_ID, 'agencies', []);
      console.log('✅ "agencies" collection exists\n');
    } catch (error) {
      if (error.code === 404) {
        console.error('❌ "agencies" collection does not exist. Please create it first.');
        console.log('\nTo create the collection, ensure it has the same attributes as the "agency" collection:');
        console.log('- name (string)');
        console.log('- logo (string)');
        console.log('- address (string)');
        console.log('- bankAccount (string)');
        console.log('- vatCode (string)');
        console.log('- agentIds (string array)');
        console.log('- brochure (string, size: 65535)');
        return;
      }
      throw error;
    }

    // Step 3: Migrate each document
    console.log('📝 Migrating documents...');
    for (const doc of agencyDocs) {
      const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;

      try {
        const newDoc = await databases.createDocument(
          DATABASE_ID,
          'agencies',
          $id, // Preserve the same ID
          data
        );
        console.log(`✅ Migrated document: ${$id}`);
        console.log(`   Name: ${data.name || 'N/A'}`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`⚠️ Document ${$id} already exists in "agencies" collection, skipping...`);
        } else {
          console.error(`❌ Failed to migrate document ${$id}:`, error.message);
        }
      }
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n⚠️ IMPORTANT: The old "agency" collection still exists.');
    console.log('After verifying the migration, you can manually delete it from the Appwrite Console.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the migration
migrateAgencyToAgencies()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
