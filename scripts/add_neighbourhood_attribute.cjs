const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = 'estately-main';
const COLLECTION_ID = 'properties';

async function addNeighbourhoodAttribute() {
  try {
    console.log('\n🔧 Adding neighbourhood attribute to properties collection...\n');

    // First, check if attribute already exists
    const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
    const existingAttr = collection.attributes.find(attr => attr.key === 'neighbourhood');

    if (existingAttr) {
      console.log('✅ neighbourhood attribute already exists!');
      console.log(`   Type: ${existingAttr.type}, Size: ${existingAttr.size}`);
      return;
    }

    // Create neighbourhood attribute (JSON string, max 2000 chars)
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'neighbourhood',
      2000,
      false // not required
    );

    console.log('✅ neighbourhood attribute created successfully!');
    console.log('   Type: string (JSON), Size: 2000, Required: false\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addNeighbourhoodAttribute();
