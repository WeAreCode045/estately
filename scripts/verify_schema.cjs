const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

const expectedCollections = [
  'agencies',
  'profiles',
  'properties',
  'projects',
  'tasks',
  'documents',
  'form_submissions',
  'sign_requests',
  'contract_templates'
];

async function verifySchema() {
  console.log('🔍 Verifying JSON-based schema...\n');

  try {
    const collections = await databases.listCollections(DATABASE_ID);
    console.log(`✓ Found ${collections.collections.length} collections in database\n`);

    for (const collectionId of expectedCollections) {
      try {
        const collection = await databases.getCollection(DATABASE_ID, collectionId);
        const attributes = collection.attributes || [];
        console.log(`✅ ${collectionId}: ${attributes.length} attributes`);

        // Show JSON attributes
        const jsonAttrs = attributes.filter(attr =>
          attr.size >= 1000 && attr.type === 'string'
        );
        if (jsonAttrs.length > 0) {
          console.log(`   📦 JSON fields: ${jsonAttrs.map(a => a.key).join(', ')}`);
        }
      } catch (error) {
        console.log(`❌ ${collectionId}: Not found`);
      }
    }

    console.log('\n✅ Schema verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifySchema();
