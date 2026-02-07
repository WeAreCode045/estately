const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = 'estately-main';

async function checkCollection() {
  try {
    const collection = await databases.getCollection(DATABASE_ID, 'properties');

    console.log('\n📁 Properties Collection\n');
    console.log('ID:', collection.$id);
    console.log('Name:', collection.name);
    console.log('\n📋 Attributes:\n');

    collection.attributes.forEach(attr => {
      console.log(`${attr.key}:`);
      console.log(`  Type: ${attr.type}`);
      console.log(`  Array: ${attr.array || false}`);
      console.log(`  Required: ${attr.required}`);
      if (attr.size) console.log(`  Size: ${attr.size}`);
      if (attr.format) console.log(`  Format: ${attr.format}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCollection();
