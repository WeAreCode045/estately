/**
 * Create required attributes in the 'agencies' collection
 */

const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';
const COLLECTION_ID = 'agencies';

async function createAttributes() {
  console.log('🔧 Creating attributes for "agencies" collection...\n');

  const attributes = [
    { name: 'name', type: 'string', size: 255, required: true },
    { name: 'logo', type: 'string', size: 2000, required: false },
    { name: 'address', type: 'string', size: 500, required: false },
    { name: 'bankAccount', type: 'string', size: 100, required: false },
    { name: 'vatCode', type: 'string', size: 50, required: false },
    { name: 'agentIds', type: 'string[]', required: false },
    { name: 'brochure', type: 'string', size: 1000000, required: false }, // Large size for JSON
  ];

  for (const attr of attributes) {
    try {
      console.log(`Creating attribute: ${attr.name} (${attr.type})...`);

      if (attr.type === 'string[]') {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTION_ID,
          attr.name,
          255,
          attr.required,
          null,
          true // array
        );
      } else {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTION_ID,
          attr.name,
          attr.size,
          attr.required
        );
      }

      console.log(`✅ Created: ${attr.name}\n`);

      // Wait for attribute to be available
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      if (error.code === 409) {
        console.log(`⚠️ Attribute "${attr.name}" already exists, skipping...\n`);
      } else {
        console.error(`❌ Failed to create "${attr.name}":`, error.message, '\n');
      }
    }
  }

  console.log('✨ Attribute creation complete!');
  console.log('\nℹ️ Wait 30-60 seconds for all attributes to become available before running the migration.');
}

createAttributes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
