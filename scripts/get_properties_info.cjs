const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = 'estately-main';

async function getCollectionInfo() {
  try {
    const collection = await databases.getCollection(DATABASE_ID, 'properties');

    console.log('\n📁 Properties Collection Info:\n');
    console.log('ID:', collection.$id);
    console.log('Name:', collection.name);
    console.log('\nAttributes:');

    collection.attributes.forEach(attr => {
      console.log(`  - ${attr.key} (${attr.type}) size: ${attr.size || 'N/A'}${attr.required ? ' [required]' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getCollectionInfo();
