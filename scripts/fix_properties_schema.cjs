#!/usr/bin/env node

const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = 'estately-main';
const COLLECTION_ID = 'properties';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function recreateCollection() {
  console.log('\n🔧 Recreating Properties Collection\n');

  try {
    // Delete existing
    console.log('1. Deleting existing collection...');
    try {
      await databases.deleteCollection(DATABASE_ID, COLLECTION_ID);
      console.log('   ✅ Deleted\n');
      await sleep(2000);
    } catch (error) {
      if (error.code !== 404) throw error;
      console.log('   ℹ️  Collection did not exist\n');
    }

    // Create new
    console.log('2. Creating new collection...');
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_ID,
      'Properties',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('   ✅ Created\n');
    await sleep(1000);

    // Create attributes
    console.log('3. Creating attributes...\n');

    console.log('   → description (string, 5000 chars)');
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'description', 5000, false);
    await sleep(1200);

    console.log('   → location (string, 2000 chars)');
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'location', 2000, false);
    await sleep(1200);

    console.log('   → size (string, 1000 chars)');
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'size', 1000, false);
    await sleep(1200);

    console.log('   → media (string, 5000 chars)');
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'media', 5000, false);
    await sleep(1200);

    console.log('   → rooms (string, 1000 chars)');
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'rooms', 1000, false);
    await sleep(1200);

    console.log('   → specs (string, 2000 chars)');
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'specs', 2000, false);

    console.log('\n✨ Collection recreated successfully!\n');
    console.log('Ready to import properties with:');
    console.log('  node scripts/bulk_import_properties.cjs scripts/sample_properties.json\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nIf collection has data, backup first or use Appwrite Console to manually:');
    console.error('  1. Delete properties collection');
    console.error('  2. Create new with STRING (not array) attributes\n');
    process.exit(1);
  }
}

recreateCollection();
