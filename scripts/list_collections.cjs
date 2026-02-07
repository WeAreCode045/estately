const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = 'estately-main';

async function listCollections() {
  try {
    const result = await databases.listCollections(DATABASE_ID);

    console.log(`\nFound ${result.total} collections in ${DATABASE_ID}:\n`);

    result.collections.forEach(collection => {
      console.log(`📁 ${collection.name}`);
      console.log(`   ID: ${collection.$id}`);
      console.log(`   Attributes: ${collection.attributes.length}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listCollections();
